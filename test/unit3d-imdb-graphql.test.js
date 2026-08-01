const assert = require('node:assert/strict');
const { createHash, webcrypto } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { TextEncoder } = require('node:util');
const { URLSearchParams } = require('node:url');

const source = readFileSync(
  resolve(__dirname, '..', 'UNIT3D_based', 'unit3d-imdb-combined.user.js'),
  'utf8'
);
const start = source.indexOf('  async function imdbGraphqlRequest');
const end = source.indexOf('\n  function textRequest', start);
assert.notEqual(start, -1, 'IMDb GraphQL helper missing');
assert.notEqual(end, -1, 'IMDb GraphQL helper end marker missing');

const calls = [];
const GM_xmlhttpRequest = (options) => {
  calls.push(options);
  options.onload({
    responseText:
      calls.length === 1
        ? '{"errors":[{"message":"PersistedQueryNotFound","extensions":{"code":"PERSISTED_QUERY_NOT_FOUND"}}]}'
        : '{"data":{"title":{"id":"tt1234567"}}}',
    status: 200
  });
};
const factory = new Function(
  'GM_xmlhttpRequest',
  'crypto',
  'TextEncoder',
  'URLSearchParams',
  `${source.slice(start, end)}\nreturn imdbGraphqlRequest;`
);
const request = factory(GM_xmlhttpRequest, webcrypto, TextEncoder, URLSearchParams);
const query = 'query TestOperation($id: ID!) { title(id: $id) { id } }';
const variables = { id: 'tt1234567' };

request(query, variables)
  .then((response) => {
    assert.equal(response.data.title.id, variables.id);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, 'GET');
    assert.equal(calls[1].method, 'POST');

    const getUrl = new URL(calls[0].url);
    const extensions = JSON.parse(getUrl.searchParams.get('extensions'));
    assert.equal(getUrl.origin, 'https://caching.graphql.imdb.com');
    assert.equal(getUrl.searchParams.get('operationName'), 'TestOperation');
    assert.deepEqual(JSON.parse(getUrl.searchParams.get('variables')), variables);
    assert.equal(
      extensions.persistedQuery.sha256Hash,
      createHash('sha256').update(query).digest('hex')
    );

    const postBody = JSON.parse(calls[1].data);
    assert.equal(postBody.query, query);
    assert.equal(postBody.operationName, 'TestOperation');

    const rejectRequest = factory(
      (options) =>
        options.onload({
          responseText:
            '{"errors":[{"message":"request rejected","extensions":{"code":"GRAPHQL_VALIDATION_FAILED"}}]}',
          status: 200
        }),
      webcrypto,
      TextEncoder,
      URLSearchParams
    );
    return assert.rejects(
      rejectRequest(query, variables),
      /IMDb GraphQL TestOperation: GRAPHQL_VALIDATION_FAILED: request rejected/
    );
  })
  .catch((error) => {
    process.nextTick(() => {
      throw error;
    });
  });

module.exports = [
  {
    files: ["**/*.js"],
    ignores: ["**/node_modules/**", "**/__pycache__/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script"
    },
    rules: {
      "no-multi-spaces": "error",
      "no-trailing-spaces": "error"
    }
  }
];

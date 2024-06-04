const sceneGroups = [
    "0MNiDVD", "0TV", "1920", "2HD", "2PaCaVeLi", "420RipZ", "433", "4FR", "4HM", "4kHD", "7SinS",
    "A4O", "aAF", "AaS", "ABEZ", "ABD", "ACCLAIM", "ACED", "ADHD", "ADMiRALS", "adrenaline", "AEGiS", 
    "AEN", "AEROHOLiCS", "AFO", "aGGr0", "AiR3D", "AiRFORCE", "AiRLiNE", "AiRWAVES", "ALDi", "ALLiANCE", 
    "ALLURE", "AMIABLE", "AMBiTiOUS", "AMRAP", "AMSTEL", "ANARCHY", "aNBc", "ANGELiC", "ANiHLS", 
    "ANiVCD", "ApL", "AQUA", "ARCHiViST", "Argon", "ARiGOLD", "ARiSCO", "ARiSCRAPAYSiTES", "ARROW", 
    "ARTHOUSE", "ASAP", "AsiSter", "aTerFalleT", "ATS", "AVCDVD", "AVCHD", "AVS", "AVS720", "aWake", 
    "AzNiNVASiAN", "AZuRRaY", "BaCKToRG", "BaCo", "BAJSKORV", "BAKED", "BaLD", "BALLS", "BAMBOOZLE", 
    "BAND1D0S", "BARGE", "BATV", "BAVARiA", "BAWLS", "BBDvDR", "BDA", "BDDK", "BDGRP", "BDMV", "BDP", 
    "BestHD", "BeStDivX", "BETAMAX", "BFF", "BiA", "BiEN", "BiERBUiKEN", "BiFOS", "BiGBruv", "BiGFiL", 
    "BiPOLAR", "BiRDHOUSE", "BLooDWeiSeR", "BountyHunters", "BOSSLiKE", "BOW", "BRASTEMP", "BRDC", 
    "BREiN", "BrG", "BRICKSQUaD", "BRiGANDBiL", "BRMP", "BRUTUS", "BTVG", "BULLDOZER", "BURGER", "BWB",
    "c0nFuSed", "C4TV", "CADAVER", "CAELUM", "CAFFiNE", "CAMELOT", "CAMERA", "CarVeR", "CBGB", "CCAT", 
    "CCT", "CDP", "Centropy", "CFE", "CFH", "CG", "Chakra", "CHaWiN", "CHECKMATE", "CHRONO", "CiA", 
    "CiELO", "CiNEFiLE", "Cinemaniacs", "CiNEMATiC", "CiNEVCD", "CiPA", "CiRCLE", "CiTRiN", "CLASSiC", 
    "ClassicBluray", "CLiX", "CLUE", "CMBHD", "CME", "CNHD", "cNLDVDR", "COALiTiON", "COASTER", 
    "COCAIN", "COJONUDO", "COMPRISED", "COMPULSiON", "CONDITION", "CONSCiENCE", "CONVOY", 
    "CookieMonster", "Counterfeit", "COUP", "CoWRY", "CRAVERS", "CREED", "CREEPSHOW", "CRiMSON", 
    "CROSSBOW", "CROSSFiT", "CROOKS", "CRUCiAL", "CTU", "CULTHD", "CULTXviD", "CYBERMEN",
    "D0PE", "D3Si", "DA", "DAA", "DAH", "DarduS", "DARKFLiX", "DASH", "DATA", "DcN", "DCP", "DDX", 
    "DEADPiXEL", "DEADPOOL", "DEAL", "DeBCz", "DeBijenkorf", "DeBTViD", "DEFACED", "DEFLATE", 
    "DEFUSED", "DEiMOS", "DEiTY", "DEMAND", "DEPRAViTY", "DEPTH", "DERANGED", "DFA", "DGX", "DHD", 
    "DiAMOND", "DiCH", "DIE", "DigitalVX", "DIMENSION", "DioXidE", "DiSPLAY", "DiSPOSABLE", "DivBD", 
    "DiVERGE", "DiVERSE", "DiVXCZ", "DJUNGELVRAL", "DMT", "DNA", "DnB", "DNR", "DOCERE", "DOCUMENT", 
    "DOMiNATE", "DOMiNiON", "DOMiNO", "DoNE", "DoR2", "dotTV", "DOWN", "DPiMP", "DRABBITS", 
    "DREAMLiGHT", "DROiDS", "DTFS", "DUH", "DuSS", "DvF", "DVL", "DvP",
    "EDHD", "EDRP", "EDUCATiON", "ELiA", "EMERALD", "EPiSODE", "ERyX", "ESPiSE", "ESPN", "ETACH", 
    "EViLISO", "EVOLVE", "EwDp", "EXiLE", "EXIST3NC3", "EXT", "EXViD", "EXViDiNT",
    "FA", "FADE", "FAiLED", "FAIRPLAY", "FEVER", "FFM", "FFNDVD", "FHD", "FiCO", "Fidelio", "FiDO", 
    "FiHTV", "FilmHD", "FIXIT", "FKKHD", "FLAiR", "FLAiTE", "FLAME", "FliK", "FmE", "FoA", "FORBiDDEN", 
    "ForceBlue", "FoV", "FQM", "FRAGMENT", "FSiHD", "FTC", "FTP", "FUA", "FULLSiZE", "FUTURiSTiC", 
    "FUtV", "FZERO",
    "GAMETiME", "GAYGAY", "GDR", "GECKOS", "GeiWoYIZhangPiAOBA", "GENESIDE", "GENUiNE", "GERUDO", 
    "GETiT", "GFW", "GHOULS", "GiMBAP", "GiMCHi", "GL", "GM4F", "GMB", "Goatlove", "GOOGLE", "GORE", 
    "GreenBlade", "GUACAMOLE", "GUYLiAN", "GZP", "GGWP", "GGEZ", "GLHF",
    "HACO", "HAGGiS", "HAFVCD", "HALCYON", "HANNIBAL", "HCA", "HD_Leaks", "HD1080", "HD4U", 
    "HDCLASSiCS", "HDCP", "HDEX", "HDi", "HDMI", "HDpure", "HiFi", "HLS", "HooKah", "HiVE", 
    "HYGGE", "HTO", "hV", "HYBRiS", "HyDe",
    "iFN", "iFPD", "iGNiTE", "iGNiTiON", "IGUANA", "iHATE", "iKA", "iLG", "iLLUSiON", "iLS", "iMBT", 
    "IMMERSE", "iMMORTALS", "iMOVANE", "iNCiTE", "iNCLUSION", "iNFAMOUS", "iNGOT", "iNjECTiON", 
    "INSECTS", "iNSPiRE", "iNSPiRED", "iNTiMiD", "iNVANDRAREN", "INVEST", "iSG", "iTWASNTME", "iVL",
    "Jackal", "JACKVID", "JAG", "Japhson", "JAR", "JFKXVID", "JKR", "JMT", "JoKeR", "JoLLyRoGeR", 
    "JUMANJi", "JustWatch",
    "KAFFEREP", "KaKa", "KAMERA", "KART3LDVD", "KEG", "KILLERS", "KJS", "KLiNGON", "KNOCK", "KON", 
    "KSi", "KuDoS", "KYR", "KOGi", "KURRAGOMMA",
    "LAJ", "LAP", "Larceny", "LAZERS", "LCHD", "LD", "LEON", "LEViTY", "LiBRARiANS", "LiGHTNiNG", 
    "LiNE", "LMG", "LOGiES", "LOL", "LOST", "LRC", "LUSO", "LPD", "LUSEKOFTA",
    "M14CH0", "MAGiC", "MainEvent", "MAJiKNiNJAZ", "MANGACiTY", "MATCH", "MaxHD", "MEDDY", 
    "MEDiAMANiACS", "MELBA", "MELiTE", "MenInTights", "METCON", "METiS", "MHQ", "MHT", "MIDDLE", 
    "MiMiC", "MiNDTHEGAP", "MoA", "MODERN", "MoF", "MoH", "MOMENTUM", "MOTION", "MOVEiT", "MSD", 
    "MTB", "MuXHD", "MVM", "MVN", "MVS", "M0RETV", "NAISU",
    "NANO", "NaWaK", "nDn", "NDRT", "NeDiVx", "NEPTUNE", "NERDHD", "NERV", "NewMov", "NGB", "NGR", 
    "NHH", "NiCEBD", "NJKV", "NLSGDVDr", "NODLABS", "NoLiMiT", "NORDiCHD", "NORiTE", "NORKiDS", 
    "NORPiLT", "NOSCREENS", "NoSence", "NrZ", "NAISU", "NOMA", "NORDCUP", "NAISU", "NOMA", "NORDCUP", 
    "NORUSH",
    "o0o", "OCULAR", "OEM", "OLDHAM", "OMERTA", "OMiCRON", "OohLaLa", "OPiUM", "OPTiC", "ORC", 
    "ORCDVD", "ORENJi", "ORGANiC", "ORiGiNAL", "OSiRiS", "OSiTV", "OUIJA", "OLDTiME", "OLLONBORRE", 
    "OPUS",
    "P0W4", "P0W4DVD", "PARASiTE", "PARTiCLE", "PaTHe", "PCH", "PFa", "PHASE", "PiRATE", "PiX", 
    "PKPTRS", "BLACKPANTERS", "PiNKPANTERS", "PQPTRS", "PLUTONiUM", "PostX", "PoT", "PRECELL", "PREMiER", 
    "PRiDEHD", "PRiNCE", "PROGRESS", "PROMiSE", "ProPL", "PROVOKE", "PROXY", "PSYCHD", "PTi", 
    "PTWINNER", "PEGASUS", "PVR",
    "QCF", "QiM", "QiX", "QPEL", "QRUS",
    "R3QU3ST", "R4Z3R", "RCDiVX", "RedBlade", "REFiNED", "REGEXP", "REiGN", "RELEASE", "Replica", 
    "REPRiS", "Republic", "REQ", "RESISTANCE", "RetailBD", "RETRO", "REVEiLLE", "REVOLTE", "REWARD", 
    "RF", "RFtA", "RiFF", "RiTALiN", "RiTALiX", "RiVER", "ROOR", "ROUGH", "ROUNDROBIN", "ROVERS", 
    "RRH", "RTA", "RUBY", "RUNNER", "RUSTED", "RUSTLE", "Ryotox", "RADiOACTiVE",
    "SADPANDA", "SAiMORNY", "SAiNTS", "SAPHiRE", "SATIVA", "SBC", "SCARED", "SChiZO", "SCREAM", 
    "SD6", "SECRETOS", "SECTOR7", "SEiGHT", "SEMTEX", "SEPTiC", "SERUM", "SFM", "SharpHD", 
    "SHOCKWAVE", "SHORTBREHD", "SiNNERS", "SKA", "SKGTV", "SLeTDiVX", "SomeTV", "SONiDO", "SORNY", 
    "SPARKS", "SPLiNTER", "SPOOKS", "SPRiNTER", "SQUEAK", "SQUEEZE", "SRiZ", "SRP", "ss", "SSF", 
    "SPAMnEGGS", "STRINGERBELL", "STRiFE", "STRONG", "StyleZz", "SUBTiTLES", "SUM", "SUPERiER", 
    "SUPERSIZE", "SuPReME", "SVA", "SVD", "SVENNE", "SKRiTT", "SKYFiRE", "SLOT", "SCONES", "SENPAI",
    "TAPAS", "TARGET", "TASTE", "TBS", "TBZ", "TDF", "TEKATE", "TELEViSiON", "TENEIGHTY", "TERMiNAL", 
    "TFE", "TGP", "TheBatman", "ThEdEaDLiVe", "TheFrail", "THENiGHTMAREiNHD", "TheWretched", "TiDE", 
    "Tiggzz", "TiiX", "TLA", "tlf", "TNAN", "ToF", "TOPAZ", "TORO", "TRG", "TrickorTreat", "TRiPS", 
    "TRUEDEF", "TrV", "TUBE", "TURBO", "TURKiSO", "TUSAHD", "TVP", "TWCiSO", "TWiST", "TWiZTED", 
    "TXF", "TxxZ", "TOOSA", "TABULARiA", "TOOSA", "UNDERTAKERS", "WATCHABLE", "xD2V",
    "UAV", "UBiK", "UKDHD", "ULF", "ULSHD", "UltraHD", "UMF", "UNiQUE", "UNiVERSUM", "UNRELiABLE", 
    "UNSKiLLED", "USELESS", "USURY", "UNTOUCHABLES", "UNTOUCHED", "UNVEiL", "URTV", "USi",
    "VALiOMEDiA", "VALUE", "VAMPS", "VCDVaULT", "Vcore", "VeDeTT", "VERUM", "VETO", "VEXHD", 
    "VH-PROD", "VideoCD", "ViLD", "ViRA", "ViTE", "VoMiT", "vRs", "VST", "VxTXviD",
    "W4F", "WAF", "WaLMaRT", "WastedTime", "WAT", "watchHD", "WAVEY", "waznewz", "WEBSTER", 
    "WEBTiFUL", "Wednesday29th", "WHEELS", "WHiSKEY", "WhiteRhino", "WHiZZ", "WhoKnow", "WiDE", 
    "WiKeD", "WiNNiNG", "Wizeguys", "WPi", "WRD", "WATCHABLE", "STRINGERBELL",
    "x0DuS", "XanaX", "XANOR", "xCZ", "XMF", "XORBiTANT", "XPERT_HD", "XPRESS", "XR5", "xSCR", 
    "XSTREEM", "XTV", "xV", "XviK", "xD2V",
    "YCDV", "YELLOWBiRD", "YesTV",
    "ZEST", "ZZGtv"
];

export default sceneGroups;

export default [
    {
        ignores: ["node_modules/"]
    },
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                module: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "no-console": "off",
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "indent": ["error", 4],
            "eqeqeq": "error"
        }
    }
];

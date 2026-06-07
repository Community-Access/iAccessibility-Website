// Flat config. eslint-config-next 16 ships native flat-config arrays from its
// subpath exports, so we spread them directly instead of wrapping the legacy
// shareable configs in FlatCompat. The FlatCompat route crashed under ESLint 9
// ("Converting circular structure to JSON") because it tried to validate the
// new flat plugin objects against the legacy eslintrc schema.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**"],
  },
];

export default eslintConfig;

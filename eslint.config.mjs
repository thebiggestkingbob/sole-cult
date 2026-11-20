import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { files: ['app/page.tsx'], rules: { '@next/next/no-img-element': 'off' } },
];

export default config;

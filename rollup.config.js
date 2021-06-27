import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import dts from "rollup-plugin-dts"
import { terser } from "rollup-plugin-terser";

export default [
    {
        input: ['src/client.ts', 'src/server.ts', 'src/serverExecutable.ts'],
        output: {
            format: 'cjs',
            dir: 'dist',
        },
        plugins: [
            nodeResolve(),
            commonjs(),
            typescript({ include: ['./src/**/*.ts'], declaration: true, module: 'esnext'  }),
            terser(),
        ]
    }, 
    {
        // path to your declaration files root
        input: ['./dist/src/server.d.ts', './dist/src/client.d.ts', './dist/src/types.d.ts'],
        output: [{ dir: 'dist', format: 'es' }],
        plugins: [dts()],
    }
]
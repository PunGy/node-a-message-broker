const { build } = require('esbuild')
const fs = require('fs')

const { dev } = process.argv.slice(1)
    .reduce((args, arg) => ({ ...args, [arg.replace(/^-+/g, '')]: true }), {})

const baseConfig = {
    platform: 'node',
    bundle: true,
    format: 'cjs',
    minify: !dev,
    sourcemap: dev && 'external',
}

const examplesPath = './examples'
const outputDir = 'bin'

const exampleProjects = fs.readdirSync(examplesPath).filter(dir => dir !== outputDir)

const projectsConfigs = exampleProjects.map((dir) =>
{
    const currentExamplePath = `${examplesPath}/${dir}`
    const files = fs.readdirSync(currentExamplePath)

    return {
        ...baseConfig,

        watch: dev && {
            onRebuild(error, result)
            {
                if (error) console.error(`${currentExamplePath}/ watch build failed:`, error)
                else console.log(`${currentExamplePath}/ watch build succeeded:`, result)
            },
        },
        entryPoints: files.map(file => `${currentExamplePath}/${file}`),
        outdir: `${examplesPath}/${outputDir}/${dir}`,
    }
})

Promise
    .allSettled(projectsConfigs.map(build))
    .then((results) =>
    {
        console.log(results.map(
            (configResult, i) => ({ ...configResult, project: projectsConfigs[i].outdir }),
        ))
    })
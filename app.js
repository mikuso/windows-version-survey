const execa = require("execa");
const { Command } = require('commander');
const {stringify} = require('csv');
const fs = require('fs');
const {readFile} = require('fs/promises');

const program = new Command();
program.name('survey')
    .description('Surveys a network to find Windows version number of selected machines using remote registry.')
    .requiredOption('-l --list <path>', 'List of computer names')
    .requiredOption('-o --out <path>', 'Path to save CSV file')
    .parse();

async function enableRemoteRegistry(computerName) {
    console.log('enabling remote registry for', computerName);
    const res = await execa('sc', [
        '\\\\' + computerName,
        'config',
        'RemoteRegistry',
        'start=auto'
    ]);
    return res;
}

async function queryReg(regPath, computerName, failOnNotFound = false) {
    console.log('querying registry for', computerName);
    let fullPath = regPath;
    if (computerName) {
        fullPath = '\\\\' + computerName + '\\' + fullPath;
    }

    try {
        const res = await execa('reg', ['query', fullPath]);
        return res.stdout;
    } catch (err) {
        if (!failOnNotFound && err.exitCode === 1 && /ERROR: The network path was not found/.test(err.stderr)) {
            await enableRemoteRegistry(computerName);
            return await queryReg(regPath, computerName, true);
        }
        throw err;
    }
}

async function getWinVersion(computerName) {
    console.log('getting windows version for', computerName);
    const reg = await queryReg('HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', computerName);

    const os = reg.match(/^\s*ProductName\s+REG_SZ\s+(.*)$/m)?.[1];
    const release = reg.match(/^\s*ReleaseId\s+REG_SZ\s+(.*)$/m)?.[1];
    const display = reg.match(/^\s*DisplayVersion\s+REG_SZ\s+(.*)$/m)?.[1];

    return {os, release, display};
}

async function main(opts) {

    const listRaw = await readFile(opts.list, 'utf8');
    const computers = listRaw.split(/\r?\n/).map(l => l.trim()).filter(x=>x);
    console.log('Surveying computers:', computers);

    const csvStream = stringify({header: true});
    const fileStream = fs.createWriteStream(opts.out);
    csvStream.pipe(fileStream);

    await Promise.all(computers.map(async (computerName) => {
        const response = {computerName, error: '', os: '', release: '', display: ''};
        try {
            const result = await getWinVersion(computerName);
            Object.assign(response, result);
        } catch (err) {
            response.error = err.message;
        }
        csvStream.write(response);
    }));
    csvStream.end();

    console.log('Saved to:', opts.out);

}
main(program.opts()).catch(console.error);

const spawn   = require("child_process").spawn;
const dirname = require("path").dirname;
const resolve = require("path").resolve;

const PUBLISH_MINOR = "minor";
const PUBLISH_ADD   = "fix";
const PUBLISH_MAJOR = "major";
const PUBLISH_BREAK = "break";

let version = "";
let packageVersionNumber;

function spawnProcess(command, ...args) {
    return new Promise((resolve, reject) => {
        spawn(command, args, { stdio: 'inherit'})
            .on("exit", (exitCode) => {
                if ( exitCode !== 0 ) {
                    reject(`process exited with ${exitCode}`);
                } else {
                    resolve();
                }
            })
            .on("error", (e) => reject(`process ${command} error ${e}`) );
    });
}

switch ( process.argv.slice(-1)[0] ) {

    case PUBLISH_MINOR: case PUBLISH_ADD: 
        version = PUBLISH_MINOR; 
        break;
    case PUBLISH_MAJOR: case PUBLISH_BREAK: 
        version = PUBLISH_MAJOR; 
        break;
    default: 
        version = "patch"
}

const npmCommand = resolve(dirname(process.argv[0]), "npm.cmd");

// spawn new child process
const npmVersionProcess = spawn(
    npmCommand,
    ["version", version],
    {
        stdio: [process.stdin, "pipe", process.stderr]
    }
);

npmVersionProcess.stdout.on("data", (msg) => {
    packageVersionNumber = msg.toString().replace(/(^\s*|\s*$)/gm, '');
});

npmVersionProcess.on("exit", async (exitCode) => {

    if ( exitCode !== 0 ) {
        return;
    }

    try{
        await spawnProcess("git", "add", "package.json", "package-lock.json");
        await spawnProcess("git", "commit", "-m", `set new version to: ${packageVersionNumber}`);
        await spawnProcess("git", "tag", packageVersionNumber);
        await spawnProcess("git", "push");
        await spawnProcess("git", "push", "origin", packageVersionNumber);
        await spawnProcess(npmCommand, `publish`);
    } catch ( error ) {
        process.exit(1);
    }
});

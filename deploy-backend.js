const FtpDeploy = require("ftp-deploy");

const ftpDeploy = new FtpDeploy();

const dotenv = require("dotenv");

dotenv.config();



const config = {

    user: "u860480593.social.shinebuchay.com",

    password: "SBCsm225580", // Provided FTP password

    host: "193.203.173.82",

    port: 21,

    localRoot: __dirname + "/backend",

    remoteRoot: "/public_html/api", // Deployment target for backend

    include: ["*", "**/*"],

    exclude: ["node_modules/**", ".git/**", "uploads/**", ".env"],

    deleteRemote: false,

    forcePasv: true,

    sftp: false,

};



ftpDeploy

    .deploy(config)

    .then((res) => console.log("Backend Deployment finished:", res))

    .catch((err) => console.log("Deployment error:", err));


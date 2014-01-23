var libpath = process.env['VFS_FTP_COV'] ? './lib-cov' : './lib';
module.exports = require(libpath + "/jsftp");

// run `node index.js` in the terminal

console.log(`Hello Node.js v${process.versions.node}!`);

// ('*', (req, res, next) => {
//   const err = new Error(`Can't find ${req.originalUrl} on this server!`);
//   err.status = 'fail';
//   err.statusCode = 404;
//   next(err);
// });
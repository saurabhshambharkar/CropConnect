/**
 * Wraps an async function to catch any errors and pass them to the next middleware
 * This eliminates the need for try/catch blocks in async controller functions
 * 
 * @param {Function} fn - The async function to wrap
 * @returns {Function} Express middleware function
 */
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
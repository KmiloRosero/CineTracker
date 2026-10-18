/**
 * Shape of a row in the `lists` table. Types only.
 *
 * @typedef {Object} List
 * @property {number}  id
 * @property {number}  user_id
 * @property {string}  name        unique per user
 * @property {string}  created_at
 * @property {import('./Title').Title[]} [titles]  present when loaded with its titles
 */

module.exports = {};

/**
 * Shape of a row in the `records` table (one watch of a title). Types only.
 *
 * @typedef {Object} Record
 * @property {number}  id
 * @property {number}  user_id
 * @property {number}  title_id
 * @property {string}  watched_date  ISO 8601
 * @property {number|null} rating    1-10
 * @property {string|null} platform
 * @property {'pending'|'watching'|'completed'|'dropped'} status
 * @property {string|null} note
 */

module.exports = {};

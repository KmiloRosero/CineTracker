/**
 * Shape of a row in the `titles` table. Types only (JSDoc); no runtime code.
 *
 * @typedef {Object} Title
 * @property {number}  id
 * @property {number|null} user_id   owner; NULL only for data created before accounts
 * @property {number|null} tmdb_id   unique per user
 * @property {'movie'|'series'} type
 * @property {string}  title
 * @property {string|null} original_title
 * @property {string|null} overview
 * @property {string|null} poster_path
 * @property {string|null} backdrop_path
 * @property {number|null} release_year
 * @property {string|null} genres    JSON array string, e.g. '["Drama","Crime"]'
 * @property {number|null} runtime   minutes (per episode for series)
 * @property {'pending'|'watching'|'completed'|'dropped'} status
 * @property {number|null} rating    1-10
 * @property {string|null} notes
 * @property {string}  added_at
 * @property {string}  updated_at
 */

module.exports = {};

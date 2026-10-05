/**
 * @typedef {Object} Title
 * @property {number}  id
 * @property {number|null} tmdb_id
 * @property {'movie'|'series'} type
 * @property {string}  title
 * @property {string|null} original_title
 * @property {string|null} overview
 * @property {string|null} poster_path
 * @property {string|null} backdrop_path
 * @property {number|null} release_year
 * @property {string|null} genres
 * @property {number|null} runtime
 * @property {'pending'|'watching'|'completed'|'dropped'} status
 * @property {number|null} rating
 * @property {string|null} notes
 * @property {string}  added_at
 * @property {string}  updated_at
 */

function createTitle(fields = {}) {
  return {
    id: null,
    tmdb_id: null,
    type: 'movie',
    title: '',
    original_title: null,
    overview: null,
    poster_path: null,
    backdrop_path: null,
    release_year: null,
    genres: null,
    runtime: null,
    status: 'pending',
    rating: null,
    notes: null,
    added_at: null,
    updated_at: null,
    ...fields,
  };
}

module.exports = { createTitle };

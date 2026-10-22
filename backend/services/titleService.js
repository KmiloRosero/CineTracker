const titleRepository  = require('../repositories/titleRepository.js');
const recordRepository = require('../repositories/recordRepository.js');
const { validateTitleInput, validateTitleUpdate, validateId } = require('../utils/validators.js');

/** A catalog row from TMDB details (same shape the renderer's toCatalogPayload builds). */
function rowFromTmdb(details, fields = {}) {
  return {
    tmdb_id:        details.tmdb_id,
    type:           details.type,
    title:          details.title,
    original_title: details.original_title ?? null,
    overview:       details.overview ?? null,
    poster_path:    details.poster_path ?? null,
    backdrop_path:  details.backdrop_path ?? null,
    release_year:   details.release_year ?? null,
    runtime:        details.runtime ?? null,
    genres:         JSON.stringify(details.genres ?? []),
    cast_members:   details.cast?.length ? JSON.stringify(details.cast) : null,
    status:         'pending',
    rating:         null,
    notes:          null,
    ...fields,
  };
}

/** Returns the user's title or throws a user-facing "not found" error. */
function requireTitle(userId, id) {
  validateId(id, 'El id del título');
  const title = titleRepository.findById(userId, Number(id));
  if (!title) throw new Error('No se encontró el título.');
  return title;
}

function addTitle(userId, titleData) {
  validateTitleInput(titleData);
  if (titleData.tmdb_id != null && titleRepository.findByTmdbId(userId, titleData.tmdb_id)) {
    throw new Error(`"${titleData.title}" ya está en tu catálogo.`);
  }
  return titleRepository.create(userId, { ...titleData, title: titleData.title.trim() });
}

/**
 * The user's title for a TMDB id, adding it from TMDB (as pending, or with
 * `fields`) when it is not in the catalog yet. Returns { title, created }.
 * `tmdb` is injectable for tests.
 */
async function ensureFromTmdb(userId, tmdbId, type, fields = {}, tmdb = require('./tmdbService.js')) {
  validateId(tmdbId, 'El id de TMDB');
  const existing = titleRepository.findByTmdbId(userId, Number(tmdbId));
  if (existing && existing.type === type) return { title: existing, created: false };
  const details = await tmdb.getDetails(Number(tmdbId), type);
  return { title: addTitle(userId, rowFromTmdb(details, fields)), created: true };
}

function getAllTitles(userId, filters = {}) {
  return titleRepository.findAll(userId, filters ?? {});
}

function getTitleWithRecords(userId, id) {
  const title = requireTitle(userId, id);
  const records = recordRepository.findByTitleId(userId, title.id);
  return { title, records };
}

function updateTitle(userId, id, data) {
  const existing = requireTitle(userId, id);
  validateTitleUpdate(data);
  return titleRepository.update(userId, existing.id, data);
}

function deleteTitle(userId, id) {
  const existing = requireTitle(userId, id);
  return titleRepository.remove(userId, existing.id);
}

module.exports = { requireTitle, addTitle, ensureFromTmdb, rowFromTmdb, getAllTitles, getTitleWithRecords, updateTitle, deleteTitle };

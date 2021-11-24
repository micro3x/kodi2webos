/*
 * File: index.js
 * Project: kodi2webos
 * File Created: Tuesday, 19th May 2020 6:19:54 pm
 * Author: valverde82 (valverde.marcelo@gmail.com)
 * -----
 * Last Modified: Wednesday, 10th June 2020 3:29:44 pm
 * Modified By: valverde82 (valverde.marcelo@gmail.com>)
 * -----
 * Copyright 2020 © VALVERDE, Marcelo Richard. All Rigths Reserved.
 */

/**
* export default axios.create({
   baseURL: endpoint,
   responseType: "json"
 })
*/

import axios from "axios";
import { server, endpoint, URL_BASE } from "./config";
import jsonrpc from "./jsonrpc";
import videoLibrary from "./jsonrpc/VideoLibrary";
import files from './jsonrpc/Files';

import debug from '../utils/debug';
const logger = debug('api:index');

function noConfig() {
  return (server.ip === null || server.port === null || server.protocol === null);
}

import conn from '../services/connectionService';
conn.init({
  host: server.ip,
  port: server.port,
  protocol: server.protocol
});

const noConnection = async () => {
  let message = jsonrpc.ping();
  try {
    const response = await conn.instance.sendMessage(message);
    logger(response.result);
    return false;
  } catch (error) {
    logger(error);
    return true;
  }
}

const getMoviesInProgress = async (start, end) => {
  let message = videoLibrary.getMoviesInProgress(start, end);
  try {
    const response = await conn.instance.sendMessage(message);
    return response.result.movies;
  } catch (error) {
    return error;
  }
}

const getMoviesLastAdded = async (start, end) => {
  let message = videoLibrary.getMoviesLastAdded(start, end);
  try {
    const response = await conn.instance.sendMessage(message);
    return response.result.movies;
  } catch (error) {
    return error;
  }
}

const getMoviesLastViewed = async (start, end) => {
  let message = videoLibrary.getMoviesLastViewed(start, end);
  try {
    const response = await conn.instance.sendMessage(message);
    return response.result.movies;
  } catch (error) {
    return error;
  }
}

const getMoviesByGenre = async (start, end, genre) => {
  let message = videoLibrary.getMoviesByGenre(start, end, genre);
  try {
    const response = await conn.instance.sendMessage(message);
    return response.result.movies;
  } catch (error) {
    return error;
  }
}

const getGenres = async () => {
  let message = videoLibrary.getGenres();
  try {
    const response = await conn.instance.sendMessage(message);
    return response.result.genres;
  } catch (error) {
    return error;
  }
}

const getMovieSets = async () => {
  let message = videoLibrary.getMovieSets();
  try {
    const response = await conn.instance.sendMessage(message);
    return response.result.sets;
  } catch (error) {
    return error;
  }
}

const getMovieSetDetails = async (setid) => {
  let message = videoLibrary.getMovieSetDetails(setid);
  try {
    const response = await conn.instance.sendMessage(message);
    return response.result.setdetails.movies;
  } catch (error) {
    return error;
  }
}

const prepareDownload = async (_path) => {
  let message = files.prepareDownload(_path);
  try {
    const response = await conn.instance.sendMessage(message);
    const path = response.result.details.path;
    return `${URL_BASE}/${path}`;
  } catch (error) {
    return error;
  }
}

export default {
  noConfig,
  noConnection,
  getMoviesInProgress,
  getMoviesLastAdded,
  getMoviesLastViewed,
  getMoviesByGenre,
  getGenres,
  getMovieSets,
  getMovieSetDetails,
  prepareDownload
}
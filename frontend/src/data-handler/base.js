import Axios from "axios"

const address = 'http://localhost:5000'
export const axios = Axios.create();

// Adds user.token to the request header
axios.interceptors.request.use(
  (config) => {
    try {
      const requestUrl = new URL(config.url, address); // ensure absolute URL
      const { origin } = requestUrl;
      const allowedOrigins = [address];
      const token = localStorage.getItem('user.token');
      
      if (allowedOrigins.includes(origin) && token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    } catch (e) {
      // fallback if URL parsing fails
      console.warn('Could not parse request URL:', config.url);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Converts an object of query parameters to a valid query string
 *
 * @param {Object} query_parameters
 * @returns {string} The query string
 */
const parse_query_parameters = (query_parameters = {}) => {
  let query_string = "?"
  for (const [key, value] of Object.entries(query_parameters)) {
    if (Array.isArray(value)) {
      query_string += `${key}=${JSON.stringify(value)}&`
    } else if (value != null) {
      query_string += `${key}=${value}&`
    }
  }

  query_string = query_string.slice(0, -1)
  return query_string
}

/**
 * Handles any axios exception
 * https://stackoverflow.com/questions/49967779/axios-handling-errors
 *
 * @param {any} error The error object
 */
export const handle_axios_exception = (error) => {
  if (error.response) {
    if (error.response.status === 401 || error.response.status === 440) {
      // Token is gone, expired, or revoked — wipe local session and bounce
      // to /login. Avoid loops on the auth pages themselves.
      const path = window.location.pathname
      if (path !== '/login' && path !== '/signup') {
        localStorage.removeItem('user.token')
        window.location.replace('/login')
      }
      throw new Error('Your session has ended. Please sign in again.')
    }

    throw new Error(error.response.data.message)
  } else if (error.request) {
    console.log("The request was made but no response was made")
    console.log(error.request)
    throw new Error(
      "Router API: Failed to connect to Router API. Make sure mars-gateway is running on docker. If this issue persists, please restart the app."
    )
  } else {
    console.log("Request Setup Error", error.message)
    throw new Error(error.message)
  }
}

/**
 * Makes a GET request to the backend
 */
export const axios_get = async (path, query_parameters = {}) => {
  return axios
    .get(address + path + parse_query_parameters(query_parameters))
    .catch(handle_axios_exception)
}

/**
 * Makes a PATCH request to the backend
 */
export const axios_patch = async (path, patch_body = {}, query_parameters = {}) => {
  return axios
    .patch(address + path + parse_query_parameters(query_parameters), patch_body)
    .catch(handle_axios_exception)
}

/**
 * Makes a POST request to the backend
 */
export const axios_post = async (path, post_body = {}, query_parameters = {}, headers = {}) => {
  return axios
    .post(address + path + parse_query_parameters(query_parameters), post_body, { headers })
    .catch(handle_axios_exception)
}

/**
 * Makes a PUT request to the backend
 */
export const axios_put = async (path, put_body = {}, query_parameters = {}) => {
  return axios
    .put(address + path + parse_query_parameters(query_parameters), put_body)
    .catch(handle_axios_exception)
}

/**
 * Makes a DELETE request to the backend
 */
export const axios_delete = async (path, query_parameters = {}) => {
  return axios
    .delete(address + path + parse_query_parameters(query_parameters))
    .catch(handle_axios_exception)
}

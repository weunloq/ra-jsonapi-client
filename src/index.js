import { stringify } from "qs";
import merge from "deepmerge";
import axios from "axios";
import {
  GET_LIST,
  GET_ONE,
  CREATE,
  UPDATE,
  DELETE,
  GET_MANY,
  GET_MANY_REFERENCE,
} from "./actions";

import defaultSettings from "./default-settings";
import { NotImplementedError } from "./errors";
import init from "./initializer";

// Set HTTP interceptors.
init();

/**
 * Maps react-admin queries to a JSONAPI REST API
 *
 * @param {string} apiUrl the base URL for the JSONAPI
 * @param {Object} userSettings Settings to configure this client.
 *
 * @param {string} type Request type, e.g GET_LIST
 * @param {string} resource Resource name, e.g. "posts"
 * @param {Object} payload Request parameters. Depends on the request type
 * @returns {Promise} the Promise for a data response
 */
export default (apiUrl, userSettings = {}) =>
  (type, resource, params) => {
    let url = "";
    const settings = merge(defaultSettings, userSettings);

    const options = {
      headers: settings.headers,
    };

    switch (type) {
      case GET_LIST: {
        const { page, perPage } = params.pagination;

        // Create query with pagination params.
        const query = {
          "page[number]": page,
          "page[size]": perPage,
        };

        // Add all filter params to query.
        Object.keys(params.filter || {}).forEach((key) => {
          query[`filter[${key}]`] = params.filter[key];
        });

        // Add fields parameters
        params = addFieldsToparams(resource, params);
        Object.keys(params.fields || {}).forEach(function (field) {
          query["fields[" + field + "]"] = params.fields[field];
        });

        // Add sort parameter
        if (params.sort && params.sort.field) {
          const prefix = params.sort.order === "ASC" ? "" : "-";
          query.sort = `${prefix}${params.sort.field}`;
        }

        url = `${apiUrl}/${resource}?${stringify(query)}`;
        break;
      }

      case GET_ONE:
        url = `${apiUrl}/${resource}/${params.id}`;
        break;

      case CREATE:
        url = `${apiUrl}/${resource}`;
        options.method = "POST";
        options.data = JSON.stringify({
          data: { type: resource, attributes: params.data },
        });
        break;

      case UPDATE: {
        url = `${apiUrl}/${resource}/${params.id}`;

        const attributes = params.data;
        delete attributes.id;

        const data = {
          data: {
            id: params.id,
            type: resource,
            attributes,
          },
        };

        options.method = settings.updateMethod;
        options.data = JSON.stringify(data);
        break;
      }

      case DELETE:
        url = `${apiUrl}/${resource}/${params.id}`;
        options.method = "DELETE";
        break;

      case GET_MANY: {
        const query = stringify(
          {
            [`filter[${settings.getManyKey}]`]: params.ids,
          },
          { arrayFormat: settings.arrayFormat }
        );

        url = `${apiUrl}/${resource}?${query}`;
        break;
      }

      case GET_MANY_REFERENCE: {
        const { page, perPage } = params.pagination;

        // Create query with pagination params.
        const query = {
          "page[number]": page,
          "page[size]": perPage,
        };

        // Add all filter params to query.
        Object.keys(params.filter || {}).forEach((key) => {
          query[`filter[${key}]`] = params.filter[key];
        });

        // Add the reference id to the filter params.
        query[`filter[${params.target}]`] = params.id;

        // Add sort parameter
        if (params.sort && params.sort.field) {
          const prefix = params.sort.order === "ASC" ? "" : "-";
          query.sort = `${prefix}${params.sort.field}`;
        }

        url = `${apiUrl}/${resource}?${stringify(query)}`;
        break;
      }

      default:
        throw new NotImplementedError(
          `Unsupported Data Provider request type ${type}`
        );
    }

    return axios({ url, ...options }).then((response) => {
      let total;

      // For all collection requests get the total count.
      if ([GET_LIST, GET_MANY, GET_MANY_REFERENCE].includes(type)) {
        // When meta data and the 'total' setting is provided try
        // to get the total count.
        if (response.data.meta && settings.total) {
          total = response.data.meta[settings.total];
        }

        // Use the length of the data array as a fallback.
        total = total || response.data.data.length;
      }

      switch (type) {
        case GET_MANY:
        case GET_LIST: {
          return {
            data: response.data.data.map((value) =>
              Object.assign({ id: value.id }, value.attributes)
            ),
            total,
          };
        }

        case GET_MANY_REFERENCE: {
          return {
            data: response.data.data.map((value) =>
              Object.assign({ id: value.id }, value.attributes)
            ),
            total,
          };
        }

        case GET_ONE: {
          const { id, attributes } = response.data.data;

          return {
            data: {
              id,
              ...attributes,
            },
          };
        }

        case CREATE: {
          const { id, attributes } = response.data.data;

          return {
            data: {
              id,
              ...attributes,
            },
          };
        }

        case UPDATE: {
          const { id, attributes } = response.data.data;

          return {
            data: {
              id,
              ...attributes,
            },
          };
        }

        case DELETE: {
          return {
            data: { id: params.id },
          };
        }

        default:
          throw new NotImplementedError(
            `Unsupported Data Provider request type ${type}`
          );
      }
    });
  };

function addFieldsToparams(resource, params) {
  const baseKey = `RaStore.preferences.${resource}.datagrid`;

  const columns = JSON.parse(localStorage.getItem(`${baseKey}.columns`));
  const omit = JSON.parse(localStorage.getItem(`${baseKey}.omit`));
  const available = JSON.parse(
    localStorage.getItem(`${baseKey}.availableColumns`)
  );

  let selected = available;
  if (omit != null) {
    selected = available.filter((a) => !omit.find((o) => a["source"] == o));
  }
  if (columns != null) {
    selected = columns.map((c) => available.find((a) => a["index"] == c));
  }

  if (selected != null) {
    const resourceParts = resource.split("/");
    const apiResource = resourceParts[resourceParts.length - 1];

    params["fields"] = {};
    params["fields"][apiResource] = selected.map((s) => s.source).join(",");
  }

  return params;
}

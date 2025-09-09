"use strict"

Object.defineProperty(exports, "__esModule", {
  value: true,
})

var _extends =
  Object.assign ||
  function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i]
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key]
        }
      }
    }
    return target
  } /* eslint-disable linebreak-style */

var _qs = require("qs")

var _deepmerge = require("deepmerge")

var _deepmerge2 = _interopRequireDefault(_deepmerge)

var _axios = require("axios")

var _axios2 = _interopRequireDefault(_axios)

var _actions = require("./actions")

var _defaultSettings = require("./default-settings")

var _defaultSettings2 = _interopRequireDefault(_defaultSettings)

var _errors = require("./errors")

var _initializer = require("./initializer")

var _initializer2 = _interopRequireDefault(_initializer)

var _helpers = require("./helpers")
const { param } = require("jquery")

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}

// Set HTTP interceptors.
;(0, _initializer2.default)()

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

exports.default = function (apiUrl) {
  var userSettings =
    arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {}
  return function (type, resource, params) {
    var url = ""
    var settings = (0, _deepmerge2.default)(
      _defaultSettings2.default,
      userSettings
    )

    var options = {
      headers: settings.headers,
    }

    switch (type) {
      case _actions.GET_LIST: {
        var _params$pagination = params.pagination,
          page = _params$pagination.page,
          perPage = _params$pagination.perPage

        // Create query with pagination params.

        var query = {
          "page[number]": page,
          "page[size]": perPage,
        }

        // Add all filter params to query.
        Object.keys(params.filter || {}).forEach(function (key) {
          query["filter[" + key + "]"] = params.filter[key]
        })

        params = addFieldsToparams(resource, params)
        Object.keys(params.fields || {}).forEach(function (field) {
          query["fields[" + field + "]"] = params.fields[field]
        })

        Object.keys(params.meta || {}).forEach(function (meta) {
          query["meta[" + meta + "]"] = params.meta[meta]
        })

        // Add sort parameter
        if (params.sort && params.sort.field) {
          var prefix = params.sort.order === "ASC" ? "" : "-"
          query.sort = "" + prefix + params.sort.field
        }

        url = apiUrl + "/" + resource + "?" + (0, _qs.stringify)(query)
        break
      }

      case _actions.GET_ONE:
        url = apiUrl + "/" + resource + "/" + params.id
        break

      case _actions.CREATE:
        url = apiUrl + "/" + resource
        options.method = "POST"
        options.data = JSON.stringify({
          data: { type: resource, attributes: params.data },
        })
        break

      case _actions.UPDATE: {
        url = apiUrl + "/" + resource + "/" + params.id

        var attributes = params.data
        delete attributes.id

        var data = {
          data: {
            id: params.id,
            type: resource,
            attributes: attributes,
          },
        }

        options.method = settings.updateMethod
        options.data = JSON.stringify(data)
        break
      }

      case _actions.UPDATE_MANY: {
        url = apiUrl + "/" + resource

        var _data = {
          ids: params.ids,
          data: params.data,
        }

        options.method = settings.updateMethod
        options.data = JSON.stringify(_data)

        break
      }

      case _actions.DELETE:
        url = apiUrl + "/" + resource + "/" + params.id
        options.method = "DELETE"
        break

      case _actions.DELETE_MANY: {
        url = apiUrl + "/" + resource
        options.method = "DELETE"
        options.data = JSON.stringify({
          ids: params.ids,
        })

        break
      }

      case _actions.GET_MANY: {
        var _query = (0, _qs.stringify)(
          {
            "filter[id]": params.ids,
          },
          { arrayFormat: settings.arrayFormat }
        )

        url = apiUrl + "/" + resource + "?" + _query
        break
      }

      case _actions.GET_MANY_REFERENCE: {
        var _params$pagination2 = params.pagination,
          _page = _params$pagination2.page,
          _perPage = _params$pagination2.perPage

        // Create query with pagination params.

        var _query2 = {
          "page[number]": _page,
          "page[size]": _perPage,
        }

        // Add all filter params to query.
        Object.keys(params.filter || {}).forEach(function (key) {
          _query2["filter[" + key + "]"] = params.filter[key]
        })

        // Add the reference id to the filter params.
        _query2["filter[" + params.target + "]"] = params.id

        url = apiUrl + "/" + resource + "?" + (0, _qs.stringify)(_query2)
        break
      }

      default:
        throw new _errors.NotImplementedError(
          "Unsupported Data Provider request type " + type
        )
    }

    return (0, _axios2.default)(_extends({ url: url }, options)).then(function (
      response
    ) {
      var total = void 0

      // For all collection requests get the total count.
      if (
        [
          _actions.GET_LIST,
          _actions.GET_MANY,
          _actions.GET_MANY_REFERENCE,
        ].includes(type)
      ) {
        // When meta data and the 'total' setting is provided try
        // to get the total count.
        if (response.data.meta && settings.total) {
          total = (0, _helpers.getValue)(response.data.meta, settings.total)
        }

        // Use the length of the data array as a fallback.
        total = total || response.data.data.length
      }

      switch (type) {
        case _actions.GET_MANY:
        case _actions.GET_LIST: {
          return {
            data: response.data.data.map(function (value) {
              return Object.assign({ id: value.id }, value.attributes)
            }),
            total: total,
            meta: response.data.meta,
          }
        }

        case _actions.GET_MANY_REFERENCE: {
          return {
            data: response.data.data.map(function (value) {
              return Object.assign({ id: value.id }, value.attributes)
            }),
            total: total,
          }
        }

        case _actions.GET_ONE: {
          var _response$data$data = response.data.data,
            id = _response$data$data.id,
            _attributes = _response$data$data.attributes

          return {
            data: _extends(
              {
                id: id,
              },
              _attributes
            ),
          }
        }

        case _actions.CREATE: {
          var _response$data$data2 = response.data.data,
            _id = _response$data$data2.id,
            _attributes2 = _response$data$data2.attributes

          return {
            data: _extends(
              {
                id: _id,
              },
              _attributes2
            ),
          }
        }

        case _actions.UPDATE: {
          var _response$data$data3 = response.data.data,
            _id2 = _response$data$data3.id,
            _attributes3 = _response$data$data3.attributes

          return {
            data: _extends(
              {
                id: _id2,
              },
              _attributes3
            ),
          }
        }

        case _actions.DELETE: {
          return {
            data: { id: params.id },
          }
        }

        case _actions.UPDATE_MANY:
        case _actions.DELETE_MANY: {
          return {
            data: params.ids,
          }
        }

        default:
          throw new _errors.NotImplementedError(
            "Unsupported Data Provider request type " + type
          )
      }
    })
  }
}

function addFieldsToparams(resource, params) {
  const baseKey = `RaStore.preferences.${resource}.datagrid`

  const columns = JSON.parse(localStorage.getItem(`${baseKey}.columns`))
  const omit = JSON.parse(localStorage.getItem(`${baseKey}.omit`))
  const available = JSON.parse(
    localStorage.getItem(`${baseKey}.availableColumns`)
  )

  let selected = available
  if (omit != null) {
    selected = available.filter((a) => !omit.find((o) => a["source"] == o))
  }
  if (columns != null) {
    selected = columns.map((c) => available.find((a) => a["index"] == c))
  }

  if (selected != null) {
    const resourceParts = resource.split("/")
    const apiResource = resourceParts[resourceParts.length - 1]

    params["fields"] = {}
    params["fields"][apiResource] = selected.map((s) => s.source).join(",")
  }

  return params
}

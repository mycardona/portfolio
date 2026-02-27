      (function () {
        if (!window.CMS) return;

        var h = window.h || window.CMS.h;
        var createClass = window.createClass || window.CMS.createClass;
        var TOKEN_KEYS = ["decap-cms-user", "netlify-cms-user", "nc-user"];
        var DEFAULT_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp"];
        var DEFAULT_MAX_FILE_SIZE_MB = 10;
        var DEFAULT_MAX_FILES_PER_UPLOAD = 25;
        var DEFAULT_MAX_TOTAL_UPLOAD_MB = 50;
        var DEFAULT_STRICT_PROXY_SECURITY = true;

        function toArray(value) {
          if (!value) return [];
          if (typeof value.toJS === "function") value = value.toJS();
          if (Array.isArray(value)) return value;
          return [value];
        }

        function normalizeGalleryValue(value) {
          var normalized = toArray(value)
            .map(function (item) {
              if (!item) return "";
              if (typeof item === "string") return item;
              return item.image || "";
            })
            .filter(Boolean);

          return Array.from(new Set(normalized));
        }

        function safeFileName(name) {
          return String(name || "image")
            .trim()
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "") || "image";
        }

        function isLocalHostname(hostname) {
          var value = String(hostname || "").toLowerCase();
          return value === "localhost" || value === "127.0.0.1" || value === "0.0.0.0" || value === "::1";
        }

        function chooseStorageMode(hostname) {
          return isLocalHostname(hostname) ? "probe_local_proxy" : "github_api";
        }

        function parseBoolean(value, fallback) {
          if (value === undefined || value === null || value === "") return !!fallback;
          if (typeof value === "boolean") return value;
          var normalized = String(value).trim().toLowerCase();
          if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
          if (normalized === "false" || normalized === "0" || normalized === "no") return false;
          return !!fallback;
        }

        function parsePositiveNumber(value, fallback) {
          var parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
          return parsed;
        }

        function parsePositiveInteger(value, fallback) {
          var parsed = Math.floor(Number(value));
          if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
          return parsed;
        }

        function normalizeExtensions(value) {
          var list = toArray(value);
          var expanded = [];
          for (var i = 0; i < list.length; i += 1) {
            var raw = String(list[i] || "");
            var parts = raw.split(",");
            for (var j = 0; j < parts.length; j += 1) {
              expanded.push(parts[j]);
            }
          }

          var normalized = expanded
            .map(function (item) {
              return String(item || "")
                .trim()
                .toLowerCase()
                .replace(/^\.+/, ".");
            })
            .filter(function (item) {
              return /^\.[a-z0-9]+$/.test(item);
            });

          return normalized.length ? Array.from(new Set(normalized)) : DEFAULT_IMAGE_EXTENSIONS.slice();
        }

        function getFileExtension(name) {
          var match = String(name || "")
            .toLowerCase()
            .match(/(\.[a-z0-9]+)$/);
          return match ? match[1] : "";
        }

        function validateUploadBatch(files, config) {
          var list = Array.isArray(files) ? files : [];
          var maxFiles = parsePositiveInteger(config && config.maxFilesPerUpload, DEFAULT_MAX_FILES_PER_UPLOAD);
          var maxTotalMb = parsePositiveNumber(config && config.maxTotalUploadMB, DEFAULT_MAX_TOTAL_UPLOAD_MB);
          var maxTotalBytes = Math.floor(maxTotalMb * 1024 * 1024);

          if (list.length > maxFiles) {
            throw new Error("Too many files selected (" + list.length + "). Max per upload is " + maxFiles + ".");
          }

          var totalBytes = list.reduce(function (sum, file) {
            var size = file && Number.isFinite(file.size) ? file.size : 0;
            return sum + size;
          }, 0);

          if (totalBytes > maxTotalBytes) {
            throw new Error(
              "Upload batch too large (" +
                Math.ceil(totalBytes / (1024 * 1024)) +
                " MB). Max total per upload is " +
                maxTotalMb +
                " MB."
            );
          }
        }

        function isLikelyGithubToken(token) {
          var value = String(token || "").trim();
          if (!value) return false;
          return /^gh[pousr]_[A-Za-z0-9_]{20,}$/.test(value) || /^github_pat_[A-Za-z0-9_]{20,}$/.test(value);
        }

        function normalizeProxyUrl(rawValue, allowRemoteProxy, strictProxySecurity) {
          var value = String(rawValue || "").trim();
          var url;
          try {
            url = new URL(value, window.location.origin);
          } catch (_error) {
            throw new Error("Invalid proxy_url value.");
          }

          var sameOrigin = url.origin === window.location.origin;
          var proxyIsLocal = isLocalHostname(url.hostname);

          if (strictProxySecurity && !proxyIsLocal) {
            throw new Error("proxy_url must point to localhost when strict_proxy_security is enabled.");
          }

          if (!proxyIsLocal && url.protocol !== "https:") {
            throw new Error("proxy_url must use https outside localhost.");
          }

          if (!allowRemoteProxy && !sameOrigin && !proxyIsLocal) {
            throw new Error("proxy_url must be same-origin or localhost unless allow_remote_proxy is true.");
          }

          return url.toString();
        }

        function normalizeRepoFolderPath(pathValue) {
          var normalized = String(pathValue || "")
            .trim()
            .replace(/\\/g, "/")
            .replace(/^\/+|\/+$/g, "");
          if (!normalized) {
            throw new Error("media_folder must not be empty.");
          }
          var segments = normalized.split("/");
          for (var i = 0; i < segments.length; i += 1) {
            var segment = segments[i];
            if (!segment || segment === "." || segment === "..") {
              throw new Error("media_folder contains an unsafe path segment.");
            }
          }
          return segments.join("/");
        }

        function isSafeRepoPath(pathValue) {
          var normalized = String(pathValue || "").trim().replace(/\\/g, "/");
          if (!normalized || normalized.indexOf("\u0000") >= 0) return false;
          if (normalized.startsWith("/") || normalized.startsWith("//")) return false;
          if (/^[A-Za-z]:\//.test(normalized)) return false;
          var segments = normalized.split("/");
          for (var i = 0; i < segments.length; i += 1) {
            var segment = segments[i];
            if (!segment || segment === "." || segment === "..") return false;
          }
          return true;
        }

        function toPublicPath(repoPath, mediaFolder, publicFolder) {
          if (!isSafeRepoPath(repoPath)) {
            throw new Error("Received unsafe repository path.");
          }
          var cleanedMedia = String(mediaFolder || "").replace(/^\/+|\/+$/g, "");
          var cleanedRepoPath = String(repoPath || "")
            .replace(/\\/g, "/")
            .replace(/^\/+|\/+$/g, "");
          var cleanedPublic = String(publicFolder || "/uploads").replace(/\/+$/g, "");

          if (!cleanedRepoPath.startsWith(cleanedMedia + "/")) {
            return "/" + cleanedRepoPath;
          }

          var relative = cleanedRepoPath.slice(cleanedMedia.length + 1);
          return (cleanedPublic.startsWith("/") ? cleanedPublic : "/" + cleanedPublic) + "/" + relative;
        }

        function readStorageToken(storage) {
          if (!storage) return "";

          for (var i = 0; i < TOKEN_KEYS.length; i += 1) {
            var raw = storage.getItem(TOKEN_KEYS[i]);
            if (!raw) continue;

            try {
              var parsed = JSON.parse(raw);
              var token =
                parsed &&
                (parsed.token ||
                  parsed.access_token ||
                  parsed.accessToken ||
                  (parsed.user && parsed.user.token) ||
                  (parsed.auth && parsed.auth.token));
              if (isLikelyGithubToken(token)) return token;
            } catch (_error) {
              continue;
            }
          }

          return "";
        }

        function getBackendToken() {
          try {
            if (!window.CMS || !window.CMS.getBackend) return "";
            var backend = window.CMS.getBackend();
            if (!backend || typeof backend !== "object") return "";

            var candidates = [
              backend.token,
              backend.accessToken,
              backend.access_token,
              backend.authToken,
              backend._authToken,
              backend.auth && backend.auth.token,
              backend.user && backend.user.token
            ];

            for (var i = 0; i < candidates.length; i += 1) {
              var token = candidates[i];
              if (isLikelyGithubToken(token)) return String(token);
            }
            return "";
          } catch (_error) {
            return "";
          }
        }

        function getGithubToken() {
          var backendToken = getBackendToken();
          if (backendToken) return backendToken;

          var storageToken = readStorageToken(window.localStorage) || readStorageToken(window.sessionStorage) || "";
          if (storageToken) return storageToken;

          return "";
        }

        function fileToBase64(file) {
          return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
              var result = String(reader.result || "");
              var commaIndex = result.indexOf(",");
              resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
            };
            reader.onerror = function () {
              reject(new Error("Failed to read file " + file.name));
            };
            reader.readAsDataURL(file);
          });
        }

        function apiHeaders(token) {
          var headers = {
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json"
          };
          if (token) headers.Authorization = "Bearer " + token;
          return headers;
        }

        function uniqueUploadPath(baseFolder, fileName, existingPaths) {
          var folder = String(baseFolder || "").replace(/^\/+|\/+$/g, "");
          var clean = safeFileName(fileName);
          var extMatch = clean.match(/(\.[^.]*)$/);
          var ext = extMatch ? extMatch[1] : "";
          var stem = ext ? clean.slice(0, -ext.length) : clean;
          var index = 0;
          var candidate;

          do {
            candidate = folder + "/" + (index === 0 ? stem + ext : stem + "-" + index + ext);
            index += 1;
          } while (existingPaths.has(candidate));

          existingPaths.add(candidate);
          return candidate;
        }

        var BulkGithubImagesControl = createClass({
          getInitialState: function () {
            return {
              items: normalizeGalleryValue(this.props.value),
              existingImages: [],
              selectedExisting: {},
              query: "",
              loadingExisting: false,
              uploading: false,
              error: "",
              status: "",
              pickerOpen: false
            };
          },

          componentDidUpdate: function (prevProps) {
            if (prevProps.value !== this.props.value) {
              this.setState({ items: normalizeGalleryValue(this.props.value) });
            }
          },

          getFieldOption: function (name, fallback) {
            var value = this.props.field && this.props.field.get ? this.props.field.get(name) : undefined;
            return value === undefined || value === null || value === "" ? fallback : value;
          },

          getConfig: function () {
            var allowRemoteProxy = parseBoolean(this.getFieldOption("allow_remote_proxy", false), false);
            var strictProxySecurity = parseBoolean(
              this.getFieldOption("strict_proxy_security", DEFAULT_STRICT_PROXY_SECURITY),
              DEFAULT_STRICT_PROXY_SECURITY
            );
            var mediaFolder = normalizeRepoFolderPath(this.getFieldOption("media_folder", "src/uploads"));
            return {
              repo: this.getFieldOption("repo", ""),
              branch: this.getFieldOption("branch", "main"),
              mediaFolder: mediaFolder,
              publicFolder: this.getFieldOption("public_folder", "/uploads"),
              proxyUrl: normalizeProxyUrl(
                this.getFieldOption("proxy_url", "http://localhost:8081/api/v1"),
                allowRemoteProxy,
                strictProxySecurity
              ),
              allowRemoteProxy: allowRemoteProxy,
              strictProxySecurity: strictProxySecurity,
              maxFileSizeMB: parsePositiveNumber(this.getFieldOption("max_file_size_mb", DEFAULT_MAX_FILE_SIZE_MB), DEFAULT_MAX_FILE_SIZE_MB),
              maxFilesPerUpload: parsePositiveInteger(
                this.getFieldOption("max_files_per_upload", DEFAULT_MAX_FILES_PER_UPLOAD),
                DEFAULT_MAX_FILES_PER_UPLOAD
              ),
              maxTotalUploadMB: parsePositiveNumber(
                this.getFieldOption("max_total_upload_mb", DEFAULT_MAX_TOTAL_UPLOAD_MB),
                DEFAULT_MAX_TOTAL_UPLOAD_MB
              ),
              allowedExtensions: normalizeExtensions(this.getFieldOption("allowed_extensions", DEFAULT_IMAGE_EXTENSIONS))
            };
          },

          syncItems: function (nextItems) {
            var deduped = Array.from(new Set((nextItems || []).filter(Boolean)));
            this.setState({ items: deduped });
            this.props.onChange(deduped);
          },

          removeItem: function (index) {
            var nextItems = this.state.items.slice();
            nextItems.splice(index, 1);
            this.syncItems(nextItems);
          },

          clearError: function () {
            this.setState({ error: "" });
          },

          ensureConfig: function () {
            var config = this.getConfig();
            if (!config.repo) {
              throw new Error("Missing widget option: repo");
            }
            return config;
          },

          postProxyAction: async function (action, params) {
            var config = this.ensureConfig();
            var response = await fetch(config.proxyUrl, {
              method: "POST",
              credentials: "same-origin",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-Requested-With": "decap-cms-widget-bulk-github-images"
              },
              body: JSON.stringify({
                action: action,
                params: params
              })
            });

            if (!response.ok) {
              var body = await response.json().catch(function () {
                return {};
              });
              var detail = body && body.error ? ": " + body.error : "";
              throw new Error("Local backend request failed (" + response.status + ")" + detail);
            }

            return response.json();
          },

          detectStorageMode: async function () {
            if (this._storageMode) return this._storageMode;
            var config = this.ensureConfig();
            var hostname = String((window.location && window.location.hostname) || "").toLowerCase();
            var preferredMode = chooseStorageMode(hostname);

            if (preferredMode === "github_api") {
              this._storageMode = "github_api";
              return this._storageMode;
            }

            try {
              await this.postProxyAction("info", { branch: config.branch });
              this._storageMode = "local_proxy";
            } catch (error) {
              this._storageMode = "local_missing";
              this._storageModeError =
                "Local CMS backend unavailable at " +
                config.proxyUrl +
                ". Start it with `npm run dev:cms` and retry.";
            }

            return this._storageMode;
          },

          getRepoTreeFromGithub: async function () {
            var config = this.ensureConfig();
            var token = getGithubToken();
            var headers = apiHeaders(token);

            var branchResponse = await fetch(
              "https://api.github.com/repos/" +
                encodeURIComponent(config.repo).replace("%2F", "/") +
                "/branches/" +
                encodeURIComponent(config.branch),
              { headers: headers }
            );

            if (!branchResponse.ok) {
              throw new Error("Unable to load branch metadata (" + branchResponse.status + ")");
            }

            var branchPayload = await branchResponse.json();
            var sha = branchPayload && branchPayload.commit && branchPayload.commit.sha;
            if (!sha) {
              throw new Error("Could not resolve branch head sha");
            }

            var treeResponse = await fetch(
              "https://api.github.com/repos/" +
                encodeURIComponent(config.repo).replace("%2F", "/") +
                "/git/trees/" +
                encodeURIComponent(sha) +
                "?recursive=1",
              { headers: headers }
            );

            if (!treeResponse.ok) {
              throw new Error("Unable to load repository tree (" + treeResponse.status + ")");
            }

            var treePayload = await treeResponse.json();
            var entries = Array.isArray(treePayload.tree) ? treePayload.tree : [];
            return entries
              .filter(function (entry) {
                return (
                  entry.type === "blob" &&
                  typeof entry.path === "string" &&
                  isSafeRepoPath(entry.path) &&
                  entry.path.startsWith(config.mediaFolder + "/")
                );
              })
              .map(function (entry) {
                return {
                  repoPath: entry.path,
                  publicPath: toPublicPath(entry.path, config.mediaFolder, config.publicFolder)
                };
              })
              .sort(function (a, b) {
                return a.repoPath.localeCompare(b.repoPath);
              });
          },

          getRepoTreeFromProxy: async function () {
            var config = this.ensureConfig();
            var mediaFiles = await this.postProxyAction("getMedia", {
              branch: config.branch,
              mediaFolder: config.mediaFolder
            });
            var files = Array.isArray(mediaFiles) ? mediaFiles : [];
            return files
              .map(function (file) {
                var repoPath = file && file.path ? String(file.path).replace(/\\/g, "/") : "";
                if (!repoPath || !isSafeRepoPath(repoPath)) return null;
                if (!repoPath.startsWith(config.mediaFolder + "/")) return null;
                return {
                  repoPath: repoPath,
                  publicPath: toPublicPath(repoPath, config.mediaFolder, config.publicFolder)
                };
              })
              .filter(Boolean)
              .sort(function (a, b) {
                return a.repoPath.localeCompare(b.repoPath);
              });
          },

          getRepoTree: async function () {
            var mode = await this.detectStorageMode();
            if (mode === "local_proxy") {
              return this.getRepoTreeFromProxy();
            }
            if (mode === "local_missing") {
              throw new Error(this._storageModeError || "Local CMS backend is unavailable.");
            }
            return this.getRepoTreeFromGithub();
          },

          loadExisting: async function () {
            this.setState({ loadingExisting: true, error: "", status: "" });
            try {
              var entries = await this.getRepoTree();
              this.setState({ existingImages: entries, loadingExisting: false, pickerOpen: true });
            } catch (error) {
              this.setState({
                loadingExisting: false,
                pickerOpen: false,
                error: error && error.message ? error.message : "Failed to load existing images."
              });
            }
          },

          toggleExisting: function (repoPath) {
            var next = Object.assign({}, this.state.selectedExisting);
            if (next[repoPath]) {
              delete next[repoPath];
            } else {
              next[repoPath] = true;
            }
            this.setState({ selectedExisting: next });
          },

          addSelectedExisting: function () {
            var selectedPaths = this.state.existingImages
              .filter(
                function (entry) {
                  return !!this.state.selectedExisting[entry.repoPath];
                }.bind(this)
              )
              .map(function (entry) {
                return entry.publicPath;
              });

            this.syncItems(this.state.items.concat(selectedPaths));
            this.setState({ selectedExisting: {}, status: "Added " + selectedPaths.length + " existing image(s)." });
          },

          handleUploadInput: async function (event) {
            var files = Array.prototype.slice.call((event.target && event.target.files) || []);
            event.target.value = "";
            if (!files.length) return;
            var config;
            try {
              config = this.ensureConfig();
              validateUploadBatch(files, config);
              var maxBytes = Math.floor(config.maxFileSizeMB * 1024 * 1024);

              for (var f = 0; f < files.length; f += 1) {
                var selected = files[f];
                var extension = getFileExtension(selected.name);
                if (config.allowedExtensions.indexOf(extension) === -1) {
                  throw new Error(
                    "Unsupported file extension for " +
                      selected.name +
                      ". Allowed: " +
                      config.allowedExtensions.join(", ")
                  );
                }
                if (selected.type && selected.type.toLowerCase().indexOf("image/") !== 0) {
                  throw new Error("Unsupported mime type for " + selected.name + ": " + selected.type);
                }
                if (selected.size > maxBytes) {
                  throw new Error(
                    "File too large: " +
                      selected.name +
                      " (" +
                      Math.ceil(selected.size / (1024 * 1024)) +
                      " MB). Max is " +
                      config.maxFileSizeMB +
                      " MB."
                  );
                }
              }
            } catch (error) {
              this.setState({
                error: error && error.message ? error.message : "Invalid file selection.",
                status: ""
              });
              return;
            }

            this.setState({ uploading: true, error: "", status: "" });

            try {
              var mode = await this.detectStorageMode();
              if (mode === "local_missing") {
                throw new Error(this._storageModeError || "Local CMS backend is unavailable.");
              }
              var token = mode === "github_api" ? getGithubToken() : "";
              if (mode === "github_api" && !token) {
                throw new Error("No GitHub token found. Sign out/in to /admin and retry.");
              }
              var headers = apiHeaders(token);

              var existingSet = new Set(
                this.state.existingImages.map(function (entry) {
                  return entry.repoPath;
                })
              );

              var uploadedPublicPaths = [];
              var uploadedEntries = [];

              for (var i = 0; i < files.length; i += 1) {
                var file = files[i];
                var repoPath = uniqueUploadPath(config.mediaFolder, file.name, existingSet);
                var content = await fileToBase64(file);

                if (mode === "local_proxy") {
                  await this.postProxyAction("persistMedia", {
                    branch: config.branch,
                    asset: {
                      path: repoPath,
                      content: content,
                      encoding: "base64"
                    },
                    options: {
                      commitMessage: "Upload media via Decap bulk gallery widget"
                    }
                  });
                } else {
                  var encodedPath = repoPath
                    .split("/")
                    .map(function (segment) {
                      return encodeURIComponent(segment);
                    })
                    .join("/");

                  var uploadResponse = await fetch(
                    "https://api.github.com/repos/" +
                      encodeURIComponent(config.repo).replace("%2F", "/") +
                      "/contents/" +
                      encodedPath,
                    {
                      method: "PUT",
                      headers: headers,
                      body: JSON.stringify({
                        message: "Upload media via Decap bulk gallery widget",
                        content: content,
                        branch: config.branch
                      })
                    }
                  );

                  if (!uploadResponse.ok) {
                    var failureBody = await uploadResponse.json().catch(function () {
                      return {};
                    });
                    var reason = failureBody.message ? ": " + failureBody.message : "";
                    throw new Error("Upload failed for " + file.name + " (" + uploadResponse.status + ")" + reason);
                  }
                }

                var publicPath = toPublicPath(repoPath, config.mediaFolder, config.publicFolder);
                uploadedPublicPaths.push(publicPath);
                uploadedEntries.push({ repoPath: repoPath, publicPath: publicPath });
              }

              this.syncItems(this.state.items.concat(uploadedPublicPaths));
              this.setState({
                existingImages: this.state.existingImages.concat(uploadedEntries).sort(function (a, b) {
                  return a.repoPath.localeCompare(b.repoPath);
                }),
                uploading: false,
                status: "Uploaded " + uploadedPublicPaths.length + " image(s)."
              });
            } catch (error) {
              this.setState({
                uploading: false,
                error: error && error.message ? error.message : "Upload failed."
              });
            }
          },

          render: function () {
            var filteredExisting = this.state.existingImages.filter(
              function (entry) {
                if (!this.state.query) return true;
                var q = this.state.query.toLowerCase();
                return (
                  entry.repoPath.toLowerCase().indexOf(q) >= 0 ||
                  entry.publicPath.toLowerCase().indexOf(q) >= 0
                );
              }.bind(this)
            );

            return h(
              "div",
              { className: this.props.classNameWrapper },
              h(
                "div",
                { style: { marginBottom: "0.75rem" } },
                h(
                  "button",
                  {
                    type: "button",
                    onClick:
                      this.state.uploading
                        ? function () {}
                        : function () {
                            this.clearError();
                            if (this.fileInput) this.fileInput.click();
                          }.bind(this),
                    disabled: this.state.uploading,
                    style: { marginRight: "0.5rem" }
                  },
                  this.state.uploading ? "Uploading..." : "Upload Images"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: this.loadExisting,
                    disabled: this.state.loadingExisting || this.state.uploading,
                    style: { marginRight: "0.5rem" }
                  },
                  this.state.loadingExisting ? "Loading..." : "Choose Existing"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick:
                      this.state.items.length
                        ? function () {
                            this.syncItems([]);
                            this.setState({ status: "Cleared gallery images." });
                          }.bind(this)
                        : function () {},
                    disabled: !this.state.items.length
                  },
                  "Clear"
                ),
                h("input", {
                  type: "file",
                  multiple: true,
                  accept: "image/*",
                  ref: function (element) {
                    this.fileInput = element;
                  }.bind(this),
                  onChange: this.handleUploadInput,
                  style: { display: "none" }
                })
              ),
              this.state.error
                ? h("p", { style: { color: "#b00020", margin: "0 0 0.5rem" } }, this.state.error)
                : null,
              this.state.status
                ? h("p", { style: { color: "#116149", margin: "0 0 0.5rem" } }, this.state.status)
                : null,
              h(
                "ul",
                { style: { listStyle: "none", margin: 0, padding: 0 } },
                this.state.items.map(
                  function (path, index) {
                    return h(
                      "li",
                      {
                        key: path + "-" + index,
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.35rem 0.5rem",
                          border: "1px solid #d9dde7",
                          marginBottom: "0.35rem",
                          borderRadius: "0.25rem"
                        }
                      },
                      h("span", { style: { overflow: "hidden", textOverflow: "ellipsis" } }, path),
                      h(
                        "button",
                        {
                          type: "button",
                          onClick: function () {
                            this.removeItem(index);
                          }.bind(this),
                          style: { marginLeft: "0.5rem" }
                        },
                        "Remove"
                      )
                    );
                  }.bind(this)
                )
              ),
              this.state.pickerOpen
                ? h(
                    "div",
                    {
                      style: {
                        marginTop: "0.75rem",
                        border: "1px solid #d9dde7",
                        borderRadius: "0.25rem",
                        padding: "0.6rem"
                      }
                    },
                    h("input", {
                      type: "text",
                      value: this.state.query,
                      placeholder: "Filter existing uploads...",
                      onChange: function (event) {
                        this.setState({ query: event.target.value });
                      }.bind(this),
                      style: { width: "100%", marginBottom: "0.5rem" }
                    }),
                    h(
                      "div",
                      {
                        style: {
                          maxHeight: "12rem",
                          overflowY: "auto",
                          border: "1px solid #e5e8ef",
                          padding: "0.35rem"
                        }
                      },
                      filteredExisting.length
                        ? filteredExisting.map(
                            function (entry) {
                              var checked = !!this.state.selectedExisting[entry.repoPath];
                              return h(
                                "label",
                                {
                                  key: entry.repoPath,
                                  style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    padding: "0.2rem 0"
                                  }
                                },
                                h("input", {
                                  type: "checkbox",
                                  checked: checked,
                                  onChange: function () {
                                    this.toggleExisting(entry.repoPath);
                                  }.bind(this)
                                }),
                                h("span", {}, entry.publicPath)
                              );
                            }.bind(this)
                          )
                        : h("p", { style: { margin: 0 } }, "No files found in uploads folder.")
                    ),
                    h(
                      "div",
                      { style: { marginTop: "0.5rem" } },
                      h(
                        "button",
                        {
                          type: "button",
                          onClick: this.addSelectedExisting,
                          disabled: !Object.keys(this.state.selectedExisting).length,
                          style: { marginRight: "0.5rem" }
                        },
                        "Add Selected"
                      ),
                      h(
                        "button",
                        {
                          type: "button",
                          onClick: function () {
                            this.setState({ pickerOpen: false, selectedExisting: {}, query: "" });
                          }.bind(this)
                        },
                        "Close"
                      )
                    )
                  )
                : null
            );
          }
        });

        var BulkGithubImagesPreview = createClass({
          render: function () {
            var items = normalizeGalleryValue(this.props.value);
            return h(
              "ul",
              { style: { margin: 0, paddingLeft: "1rem" } },
              items.map(function (path, index) {
                return h("li", { key: path + "-" + index }, path);
              })
            );
          }
        });

        if (window.__BULK_GITHUB_IMAGES_ENABLE_TEST_HOOKS__) {
          window.__BULK_GITHUB_IMAGES_TEST_HOOKS__ = {
            chooseStorageMode: chooseStorageMode,
            isLocalHostname: isLocalHostname,
            normalizeProxyUrl: normalizeProxyUrl,
            normalizeRepoFolderPath: normalizeRepoFolderPath,
            validateUploadBatch: validateUploadBatch,
            isSafeRepoPath: isSafeRepoPath,
            toPublicPath: toPublicPath
          };
        }

        CMS.registerWidget("bulkGithubImages", BulkGithubImagesControl, BulkGithubImagesPreview);
      })();

module.exports = [
  {
    name: "wasm",
    url: "https://api.github.com",
    repo: "assembly-script-aegis",
    owner: "tysonrm",
    filedir: "dist",
    branch: "master",
    path: __dirname,
    type: "wasm",
    importRemote: async () => import("wasm/domain"),
  },
  {
    name: "microservices",
    url: "https://api.github.com",
    repo: "microlib-example",
    owner: "module-federation",
    filedir: "dist",
    branch: "master",
    path: __dirname,
    type: "model",
    importRemote: async () => import("microservices/domain"),
  },
  {
    name: "adapters",
    url: "https://api.github.com",
    repo: "microlib-example",
    owner: "module-federation",
    filedir: "dist",
    branch: "master",
    path: __dirname,
    type: "adapter",
    importRemote: async () => import("microservices/adapters"),
  },
  {
    name: "services",
    url: "https://api.github.com",
    repo: "microlib-example",
    owner: "module-federation",
    filedir: "dist",
    branch: "master",
    path: __dirname,
    type: "service",
    importRemote: async () => import("microservices/services"),
  },
];

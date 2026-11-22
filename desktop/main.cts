import {
  app,
  BrowserWindow,
  Menu,
  nativeTheme,
  net,
  protocol,
  shell,
} from "electron";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const startURL = "monsoon://atlas/";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "monsoon",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function openExternal(url: string) {
  const target = URL.parse(url);

  if (target && (target.protocol === "https:" || target.protocol === "http:")) {
    void shell.openExternal(target.href).catch(console.error);
  }
}

function createWindow() {
  const window = new BrowserWindow({
    title: "Monsoon",
    width: 1360,
    height: 860,
    minWidth: 680,
    minHeight: 480,
    backgroundColor: "#11111b",
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (url !== startURL) {
      event.preventDefault();
      openExternal(url);
    }
  });

  window.once("ready-to-show", () => window.show());
  void window.loadURL(startURL);
}

app.whenReady().then(() => {
  nativeTheme.themeSource = "dark";

  const root = join(app.getAppPath(), "web");

  protocol.handle("monsoon", async (request) => {
    const url = new URL(request.url);

    if (url.host !== "atlas" || request.method !== "GET")
      return new Response(null, { status: 404 });

    let pathname: string;

    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response(null, { status: 400 });
    }

    const file = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );

    const path = relative(root, file);

    if (
      !path ||
      path === ".." ||
      path.startsWith(".." + sep) ||
      isAbsolute(path)
    )
      return new Response(null, { status: 404 });

    try {
      return await net.fetch(pathToFileURL(file).href);
    } catch {
      return new Response(null, { status: 404 });
    }
  });

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: process.platform === "darwin" ? "appMenu" : "fileMenu" },
      { role: "editMenu" },
      {
        label: "View",
        submenu: [{ role: "reload" }, { role: "togglefullscreen" }],
      },
      { role: "windowMenu" },
    ]),
  );

  createWindow();

  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

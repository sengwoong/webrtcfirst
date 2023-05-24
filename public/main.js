const {
    app,
    BrowserWindow,
    desktopCapturer,
    ipcMain,
    Menu,
    powerMonitor,
} = require('electron');
const path = require('path');

const cors = require('cors');
const express = require('express');
const expressApp = express();
const { screen } = require('electron');

let availableScreens;
let mainWindow;

const { createServer } = require('http');
const { Server } = require('socket.io');

expressApp.use(express.static(__dirname));

expressApp.get('/', function (req, res, next) {
    console.log('req path...', req.path);
    res.sendFile(path.join(__dirname, 'index.html'));
});

expressApp.set('port', 4000);
expressApp.use(cors());

const httpServer = createServer(expressApp);
httpServer.listen(4000, '0.0.0.0');
httpServer.listen(3000, '0.0.0.0');
httpServer.on('error', e => console.log('error'));
httpServer.on('listening', () => console.log('listening.....'));

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['X-Requested-With', 'Content-Type'],
        credentials: true
    }
});

const connections = io.of('/remote-ctrl');

connections.on('connection', socket => {
    console.log('connection established');

    socket.on('offer', sdp => {
        console.log('routing offer');
        // send to the electron app
        socket.broadcast.emit('offer', sdp);
    });

    socket.on('answer', sdp => {
        console.log('routing answer');
        // send to the electron app
        socket.broadcast.emit('answer', sdp);
    });

    socket.on('icecandidate', icecandidate => {
        socket.broadcast.emit('icecandidate', icecandidate);
    });

    socket.on('selectedScreen', selectedScreen => {
        clientSelectedScreen = selectedScreen;
        console.log('clientSelectedScreen', clientSelectedScreen);
        socket.broadcast.emit('selectedScreen', clientSelectedScreen);
    });
});

const sendSelectedScreen = (item) => {
    mainWindow.webContents.send('SET_SOURCE_ID', {
        id: item.id,
    });
};

const createTray = () => {
    const screensMenu = availableScreens.map(item => {
        return {
            label: item.name,
            click: () => {
                sendSelectedScreen(item);
            }
        };
    });

    const menu = Menu.buildFromTemplate([
        {
            label: app.name,
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Screens',
            submenu: screensMenu
        }
    ]);

    Menu.setApplicationMenu(menu);
};

const createWindow = () => {
    mainWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    ipcMain.on('set-size', (event, size) => {
        const { width, height } = size;
        try {
            console.log('electron dim..', width, height);
            // mainWindow.setSize(width, height || 500, true);
            !isNaN(height) && mainWindow.setSize(width, height, false);
        } catch (e) {
            console.log(e);
        }
    });

    mainWindow.loadURL('https://b6ea-220-68-8-39.ngrok-free.app/');

    mainWindow.once('ready-to-show', () => {
        displays = screen.getAllDisplays();

        mainWindow.show();
        mainWindow.setPosition(0, 0);

        desktopCapturer.getSources({
            types: ['screen']
            // types: ['window', 'screen']
        }).then(sources => {
            sendSelectedScreen(sources[0]);
            availableScreens = sources;
            createTray();
            // for (const source of sources) {
            //     console.log(sources)
            //     if (source.name === 'Screen 1') {
            //         mainWindow.webContents.send('SET_SOURCE_ID', source.id)
            //         return
            //     }
            // }
        });
    });

    mainWindow.webContents.openDevTools();
};

app.on('ready', () => {
    createWindow();
});

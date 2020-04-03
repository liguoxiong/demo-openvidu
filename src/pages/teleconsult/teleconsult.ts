import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { _throw as observableThrowError } from 'rxjs/observable/throw';
import { catchError } from 'rxjs/operators';
import { Component, HostListener, OnDestroy  } from '@angular/core';
import { NavController, Platform, AlertController } from 'ionic-angular';
import { OpenVidu, Publisher, Session, StreamEvent, StreamManager, Subscriber } from 'openvidu-browser';
import { NavParams } from 'ionic-angular';

@Component({
  selector: 'teleconsult',
  templateUrl: 'teleconsult.html',
})
export class Teleconsult implements OnDestroy {

  OPENVIDU_SERVER_URL = 'https://msc.hosobenhan.vn';

    ANDROID_PERMISSIONS = [
        this.androidPermissions.PERMISSION.CAMERA,
        this.androidPermissions.PERMISSION.RECORD_AUDIO,
        this.androidPermissions.PERMISSION.MODIFY_AUDIO_SETTINGS
    ];

    // OpenVidu objects
    OV: OpenVidu;
    session: Session;
    publisher: StreamManager; // Local
    subscribers: StreamManager[] = []; // Remotes

    // Join form
    mySessionId: string;
    myUserName: string;
    token: string;

    constructor(
        private platform: Platform,
        private navParams: NavParams,
        // private splashScreen: SplashScreen,
        // private statusBar: StatusBar,
        private httpClient: HttpClient,
        private androidPermissions: AndroidPermissions,
        public alertController: AlertController,
        public navCtrl: NavController
    ) {
        this.token = navParams.get('token');
        this.myUserName = navParams.get('userName');
        this.joinSession();
    }


    @HostListener('window:beforeunload')
    beforeunloadHandler() {
        // On window closed leave session
        this.leaveSession();
    }

    ngOnDestroy() {
        // On component destroyed leave session
        this.leaveSession();
    }

    joinSession() {
        // --- 1) Get an OpenVidu object ---

        this.OV = new OpenVidu();

        // --- 2) Init a session ---

        this.session = this.OV.initSession();

        // --- 3) Specify the actions when events take place in the session ---

        // On every new Stream received...
        this.session.on('streamCreated', (event: StreamEvent) => {
            // Subscribe to the Stream to receive it. Second parameter is undefined
            // so OpenVidu doesn't create an HTML video on its own
            const subscriber: Subscriber = this.session.subscribe(event.stream, undefined);
            this.subscribers.push(subscriber);
        });

        // On every Stream destroyed...
        this.session.on('streamDestroyed', (event: StreamEvent) => {
            // Remove the stream from 'subscribers' array
            this.deleteSubscriber(event.stream.streamManager);
        });

            this.session
                .connect(this.token, { clientData: this.myUserName })
                .then(() => {
                    // --- 5) Requesting and Checking Android Permissions
                    if (this.platform.is('cordova')) {
                        // Ionic platform
                        if (this.platform.is('android')) {
                            console.log('Android platform');
                            this.checkAndroidPermissions()
                                .then(() => this.initPublisher())
                                .catch(err => console.error(err));
                        } else if (this.platform.is('ios')) {
                            console.log('iOS platform');
                            this.initPublisher();
                        }
                    } else {
                        this.initPublisher();
                    }
                })
                .catch(error => {
                    console.log('There was an error connecting to the session:', error.code, error.message);
                });
    }

    private deleteSubscriber(streamManager: StreamManager): void {
      const index = this.subscribers.indexOf(streamManager, 0);
      if (index > -1) {
          this.subscribers.splice(index, 1);
      }
  }

  private checkAndroidPermissions(): Promise<any> {
    return new Promise((resolve, reject) => {
        this.platform.ready().then(() => {
            this.androidPermissions
                .requestPermissions(this.ANDROID_PERMISSIONS)
                .then(() => {
                    this.androidPermissions
                        .checkPermission(this.androidPermissions.PERMISSION.CAMERA)
                        .then(camera => {
                            this.androidPermissions
                                .checkPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO)
                                .then(audio => {
                                    this.androidPermissions
                                        .checkPermission(this.androidPermissions.PERMISSION.MODIFY_AUDIO_SETTINGS)
                                        .then(modifyAudio => {
                                            if (camera.hasPermission && audio.hasPermission && modifyAudio.hasPermission) {
                                                resolve();
                                            } else {
                                                reject(
                                                    new Error(
                                                        'Permissions denied: ' +
                                                        '\n' +
                                                        ' CAMERA = ' +
                                                        camera.hasPermission +
                                                        '\n' +
                                                        ' AUDIO = ' +
                                                        audio.hasPermission +
                                                        '\n' +
                                                        ' AUDIO_SETTINGS = ' +
                                                        modifyAudio.hasPermission,
                                                    ),
                                                );
                                            }
                                        })
                                        .catch(err => {
                                            console.error(
                                                'Checking permission ' +
                                                this.androidPermissions.PERMISSION.MODIFY_AUDIO_SETTINGS +
                                                ' failed',
                                            );
                                            reject(err);
                                        });
                                })
                                .catch(err => {
                                    console.error(
                                        'Checking permission ' + this.androidPermissions.PERMISSION.RECORD_AUDIO + ' failed',
                                    );
                                    reject(err);
                                });
                        })
                        .catch(err => {
                            console.error('Checking permission ' + this.androidPermissions.PERMISSION.CAMERA + ' failed');
                            reject(err);
                        });
                })
                .catch(err => console.error('Error requesting permissions: ', err));
        });
    });
}


    initPublisher() {
        // Init a publisher passing undefined as targetElement (we don't want OpenVidu to insert a video
        // element: we will manage it on our own) and with the desired properties
        const publisher: Publisher = this.OV.initPublisher(undefined, {
            audioSource: undefined, // The source of audio. If undefined default microphone
            videoSource: undefined, // The source of video. If undefined default webcam
            publishAudio: true, // Whether you want to start publishing with your audio unmuted or not
            publishVideo: true, // Whether you want to start publishing with your video enabled or not
            resolution: '640x480', // The resolution of your video
            frameRate: 30, // The frame rate of your video
            insertMode: 'APPEND', // How the video is inserted in the target element 'video-container'
            mirror: true // Whether to mirror your local video or not
        });

        // --- 6) Publish your stream ---

        this.session.publish(publisher).then(() => {
            // Store our Publisher
            this.publisher = publisher;
        });
    }

    leaveSession() {
        // --- 7) Leave the session by calling 'disconnect' method over the Session object ---

        if (this.session) {
            this.session.disconnect();
        }

        // Empty all properties...
        this.subscribers = [];
        delete this.publisher;
        delete this.session;
        delete this.OV;
    }

    back() {
        this.leaveSession();
        this.navCtrl.pop();
    }
}

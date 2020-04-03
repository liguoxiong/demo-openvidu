import { HttpClient } from '@angular/common/http';
// import { AndroidPermissions } from '@ionic-native/android-permissions';
import { _throw as observableThrowError } from 'rxjs/observable/throw';
import { catchError } from 'rxjs/operators';
import { Component } from '@angular/core';
import { NavController, AlertController } from 'ionic-angular';
import { Teleconsult} from '../teleconsult/teleconsult';
@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage {

  OPENVIDU_SERVER_URL = 'https://msc.hosobenhan.vn';

    mySessionId: string;
    myUserName: string;

    constructor(
        // private splashScreen: SplashScreen,
        // private statusBar: StatusBar,
        private httpClient: HttpClient,
        // private androidPermissions: AndroidPermissions,
        public alertController: AlertController,
        public navCtrl: NavController
    ) {
        this.generateParticipantInfo();
    }

    joinSession() {
        this.getToken().then((token) => {
            // First param is the token got from OpenVidu Server. Second param will be used by every user on event
            // 'streamCreated' (property Stream.connection.data), and will be appended to DOM as the user's nickname
            if (!token) return;
            this.navCtrl.push(Teleconsult, {token, userName: this.myUserName})
        });
    }

    getToken(): Promise<string> {
      return this.createSession(this.mySessionId)
  }

  createSession(sessionId): Promise<string>  {
    return new Promise((resolve, reject) => {
        // const body = JSON.stringify({ customSessionId: sessionId });
        // const options = {
        //     headers: new HttpHeaders({
        //         Authorization: 'Basic ' + btoa('OPENVIDUAPP:' + this.OPENVIDU_SERVER_SECRET),
        //         'Content-Type': 'application/json',
        //     }),
        // };
        return this.httpClient
            .get(this.OPENVIDU_SERVER_URL + '/api/video/getToken/' + sessionId)
            .pipe(
                catchError((error) => {
                    if (error.status === 409) {
                        resolve(sessionId);
                    } else {
                        console.warn(
                            'No connection to OpenVidu Server. This may be a certificate error at ' +
                            this.OPENVIDU_SERVER_URL,
                        );
                        if (
                            window.confirm(
                                'No connection to OpenVidu Server. This may be a certificate error at "' +
                                this.OPENVIDU_SERVER_URL +
                                // tslint:disable-next-line:max-line-length
                                '"\n\nClick OK to navigate and accept it. If no certificate warning is shown, then check that your OpenVidu Server' +
                                'is up and running at "' +
                                this.OPENVIDU_SERVER_URL +
                                '"',
                            )
                        ) {
                            location.assign(this.OPENVIDU_SERVER_URL + '/accept-certificate');
                        }
                    }
                    return observableThrowError(error);
                }),
            )
            .subscribe((response) => {
                console.log(response);
                resolve(response['token']);
            });
    });
}
    private generateParticipantInfo() {
      // Random user nickname and sessionId
      this.mySessionId = 'SessionA';
      this.myUserName = 'Participant' + Math.floor(Math.random() * 100);
  }

}

import Oauth2 from './oauth2/index';
import Client from './client/index';
import config from './services/config';
import log from './services/log';


let oauth2 = function (appKey, appSecret, redirect_uri){
    return new Oauth2(appKey, appSecret, redirect_uri);
};

// let zoomClient=function(){
//     return new Client();
// }


let setting={
    retry(opt){
        if(typeof opt==='object'){
            let retryObj=config.retry;
            for(let key in opt){
                let item=opt[key];
                if((typeof item.no==='number')&&(typeof item.condition === 'function')){
                    retryObj[key]=item;
                }
            }
        }
    },
    caseSensitive(tf=true){
        config.ifCase=tf;
    },
    debug(tf=false){
        config.debug=tf;
    },
    setUrl(url){
        let reg=/https:\/\//;
        if(reg.test(url)){
            config.url=url;
        }
    }
};

let client=function(...props){
return new Client(...props);
};

export { oauth2};
export { client};
export {setting};
export {log};

import {NginxHttpDB} from 'flyingfish_core/dist/src/index.js';

/**
 * Cert Task object
 */
export class CertTask {

    /**
     * Http definiation
     * @protected {NginxHttpDB}
     */
    protected _http: NginxHttpDB|null = null;

    /**
     * Constructor
     * @param {NginxHttpDB} http
     */
    public constructor(http: NginxHttpDB) {
        this._http = http;
    }


}
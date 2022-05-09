import {NginxDomain as NginxDomainDB} from '../Db/MariaDb/Entity/NginxDomain';
import {NginxHttp as NginxHttpDB} from '../Db/MariaDb/Entity/NginxHttp';
import {ListenTypes, NginxListen as NginxListenDB} from '../Db/MariaDb/Entity/NginxListen';
import {NginxStream as NginxStreamDB} from '../Db/MariaDb/Entity/NginxStream';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {Map as NginxMap} from '../Nginx/Config/Map';
import {Server as NginxConfServer} from '../Nginx/Config/Server';
import {Upstream} from '../Nginx/Config/Upstream';
import {NginxServer} from '../Nginx/NginxServer';

/**
 * NginxService
 */
export class NginxService {

    /**
     * ngnix service instance
     * @private
     */
    private static _instance: NginxService|null = null;

    /**
     * getInstance
     */
    public static getInstance(): NginxService {
        if (NginxService._instance === null) {
            NginxService._instance = new NginxService();
        }

        return NginxService._instance;
    }

    /**
     * _loadConfig
     * @private
     */
    private async _loadConfig(): Promise<void> {
        const conf = NginxServer.getInstance().getConf();
        conf?.resetStream();
        conf?.resetHttp();

        conf?.getStream().addVariable('js_import', '/opt/app/nginx/dist/njs.js');

        // vars --------------------------------------------------------------------------------------------------------

        const streamMap: Map<number, Map<string, NginxStreamDB>> = new Map();
        const httpMap: Map<number, Map<string, NginxHttpDB>> = new Map();

        // read db -----------------------------------------------------------------------------------------------------

        const listenRepository = MariaDbHelper.getRepository(NginxListenDB);
        const domainRepository = MariaDbHelper.getRepository(NginxDomainDB);
        const streamRepository = MariaDbHelper.getRepository(NginxStreamDB);
        const httpRepository = MariaDbHelper.getRepository(NginxHttpDB);

        const listens = await listenRepository.find();

        for (const alisten of listens) {
            // read streams by db --------------------------------------------------------------------------------------

            if (alisten.listen_type === ListenTypes.stream) {
                const tstreams = await streamRepository.find({
                    where: {
                        listen_id: alisten.id
                    }
                });

                for (const astream of tstreams) {
                    const adomain = await domainRepository.findOne({
                        where: {
                            id: astream.domain_id
                        }
                    });

                    if (adomain) {
                        if (!streamMap.has(alisten.listen_port)) {
                            streamMap.set(alisten.listen_port, new Map<string, NginxStreamDB>());
                        }

                        const mapDomainStreams = streamMap.get(alisten.listen_port);
                        mapDomainStreams!.set(adomain.domainname, astream);

                        streamMap.set(alisten.listen_port, mapDomainStreams!);
                    }
                }
            } else if (alisten.listen_type === ListenTypes.http) {
                // read http by db -----------------------------------------------------------------------------

                const https = await httpRepository.find({
                    where: {
                        listen_id: alisten.id
                    }
                });

                for (const http of https) {
                    const adomain = await domainRepository.findOne({
                        where: {
                            id: http.domain_id
                        }
                    });

                    if (adomain) {
                        if (!httpMap.has(alisten.listen_port)) {
                            httpMap.set(alisten.listen_port, new Map<string, NginxHttpDB>());
                        }

                        const mapDomainHttp = httpMap.get(alisten.listen_port);
                        mapDomainHttp!.set(adomain.domainname, http);

                        httpMap.set(alisten.listen_port, mapDomainHttp!);
                    }
                }
            }
        }

        // fill config -------------------------------------------------------------------------------------------------
        const tupstreams: string[] = [];

        streamMap.forEach((domainStreams, listenPort) => {
            const varName = `$ffstream${listenPort}`;
            const aMap = new NginxMap('$ssl_preread_server_name', varName);
            let defaultMapDomain: string|null = null;

            domainStreams.forEach((tstream, domainName) => {
                let upstreamName = 'ffus_';

                if (tstream.alias_name !== '') {
                    upstreamName += `${tstream.alias_name}_`;
                }

                upstreamName += `${tstream.domain_id}`;

                if (tupstreams.indexOf(upstreamName) === -1) {
                    tupstreams.push(upstreamName);

                    const upStream = new Upstream(upstreamName);
                    upStream.addVariable('server', `${tstream.destination_address}:${tstream.destination_port}`);

                    conf?.getStream().addUpstream(upStream);
                }

                if (tstream.isdefault) {
                    defaultMapDomain = upstreamName;
                } else {
                    aMap.addVariable(`${domainName}`, upstreamName);
                }
            });

            if (defaultMapDomain !== null) {
                aMap.addVariable('default', defaultMapDomain);
            }

            conf?.getStream().addMap(aMap);

            const aServer = new NginxConfServer();
            aServer.setListen(listenPort);
            aServer.addVariable('js_access', 'njs.accessAddressStream');
            aServer.addVariable('proxy_pass', varName);
            aServer.addVariable('ssl_preread', 'on');

            conf?.getStream().addServer(aServer);
        });

        httpMap.forEach((domainHttps, listenPort) => {
            domainHttps.forEach((ahttp, domainName) => {
                const aServer = new NginxConfServer();
                aServer.setListen(listenPort);
                aServer.setServerName(domainName);


                conf?.getHttp().addServer(aServer);
            });

            // add default server --------------------------------------------------------------------------------------
            const aServer = new NginxConfServer();
            aServer.setListen(listenPort, null, true);
            aServer.addErrorPage({
                code: '500 502 503 504',
                uri: '/bad_gateway.html'
            });

            conf?.getHttp().addServer(aServer);
        });

    }

    /**
     * start
     */
    public async start(): Promise<void> {
        await this._loadConfig();
        NginxServer.getInstance().start();

        if (NginxServer.getInstance().isRun()) {
            console.log('Nginx server is start');
        }
    }

    /**
     * stop
     */
    public async stop(): Promise<void> {
        if (NginxServer.getInstance().isRun()) {
            NginxServer.getInstance().stop();
        }
    }

    /**
     * reload
     */
    public async reload(): Promise<void> {
        await this._loadConfig();
        NginxServer.getInstance().reload();

        if (NginxServer.getInstance().isRun()) {
            console.log('Nginx server is reload');
        }
    }

}
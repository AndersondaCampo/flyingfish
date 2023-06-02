import {Router} from 'express';
import {DefaultRoute, Session, StatusCodes} from 'flyingfish_core';
import {DashboardInfoResponse, Info} from './Dashboard/Info.js';
import {PublicIPBlacklistCheck, PublicIPBlacklistCheckResponse} from './Dashboard/PublicIPBlacklistCheck.js';

/**
 * Dashboard
 */
export class Dashboard extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/dashboard/info',
            async(req, res) => {
                if (Session.isUserLogin(req.session)) {
                    res.status(200).json(await Info.getInfo());
                } else {
                    res.status(200).json({
                        public_ip: null,
                        public_ip_blacklisted: false,
                        host: null,
                        ipblocks: [],
                        ipblock_count: 0,
                        statusCode: StatusCodes.UNAUTHORIZED
                    } as DashboardInfoResponse);
                }
            }
        );

        this._routes.get(
            '/json/dashboard/publicipblacklistcheck',
            async(req, res) => {
                if (Session.isUserLogin(req.session)) {
                    res.status(200).json(await PublicIPBlacklistCheck.check());
                } else {
                    res.status(200).json({
                        statusCode: StatusCodes.UNAUTHORIZED
                    } as PublicIPBlacklistCheckResponse);
                }
            }
        );

        return super.getExpressRouter();
    }

}
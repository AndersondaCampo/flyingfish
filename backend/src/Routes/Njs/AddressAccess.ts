import {Response, Router} from 'express';
import {DateHelper, DBHelper, DefaultRoute, Logger} from 'flyingfish_core';
import {IpBlacklist as IpBlacklistDB} from '../../inc/Db/MariaDb/Entity/IpBlacklist.js';
import {IpWhitelist as IpWhitelistDB} from '../../inc/Db/MariaDb/Entity/IpWhitelist.js';
import {ListenAddressCheckType, NginxListen as NginxListenDB} from '../../inc/Db/MariaDb/Entity/NginxListen.js';

/**
 * AddressAccess
 */
export class AddressAccess extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * access
     * @param response
     * @param listen_id
     * @param realip_remote_addr
     * @param remote_addr
     * @param type
     */
    public async access(
        response: Response,
        listen_id: string,
        realip_remote_addr: string,
        remote_addr: string,
        type: string
    ): Promise<boolean> {
        Logger.getLogger().info(`AddressAccess::access: realip_remote_addr: ${realip_remote_addr} remote_addr: ${remote_addr} type: ${type}`);

        const listenId = parseInt(listen_id, 10) || 0;

        if (realip_remote_addr) {
            // global check (blacklist) --------------------------------------------------------------------------------
            if ((listenId === 0) && await this._globalCheckBlacklist(realip_remote_addr)) {
                response.status(200).send();
                return true;
            } else if ((listenId !== 0) && await this._listCheck(listenId, realip_remote_addr)) {
                // listen check (blacklist & whitelist) ----------------------------------------------------------------
                response.status(200).send();
                return true;
            }
        } else {
            Logger.getLogger().error('AddressAccess::access: realip_remote_addr is empty!');
        }

        response.status(401).send();

        return false;
    }

    /**
     * _globalCheckBlacklist
     * @param realip_remote_addr
     * @protected
     */
    protected async _globalCheckBlacklist(realip_remote_addr: string): Promise<boolean> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);
        const address = await ipBlacklistRepository.findOne({
            where: {
                ip: realip_remote_addr,
                disable: false
            }
        });

        if (!address) {
            Logger.getLogger().info(`AddressAccess::_globalCheckBlacklist: Address(${realip_remote_addr}) not found in blacklist.`);

            return true;
        }

        // update and not await
        AddressAccess._updateBlacklistBlock(address.id, address.count_block + 1).then();

        Logger.getLogger().info(`AddressAccess::_globalCheckBlacklist: Address(${realip_remote_addr}) found in blacklist!`);

        return false;
    }

    /**
     * _listCheck
     * @param listenId
     * @param realip_remote_addr
     * @protected
     */
    protected async _listCheck(listenId: number, realip_remote_addr: string): Promise<boolean> {
        const listenRepository = DBHelper.getRepository(NginxListenDB);

        const listen = await listenRepository.findOne({
            where: {
                id: listenId
            }
        });

        if (listen) {
            if (listen.enable_address_check) {
                Logger.getLogger().silly('AddressAccess::_listCheck: Listen address check is enable ...');

                switch (listen.address_check_type) {
                    case ListenAddressCheckType.white:
                        return this._listCheckWhiteList(listen.id, realip_remote_addr);

                    default:
                        return this._listCheckBlackList(listen.id, realip_remote_addr);
                }
            } else {
                return true;
            }
        } else {
            Logger.getLogger().warn(`AddressAccess::_listCheck: Listen(${listenId}) not found!`);
        }

        return false;
    }

    /**
     * _listCheckBlackList
     * @param listenId
     * @param realip_remote_addr
     * @protected
     */
    protected async _listCheckBlackList(listenId: number, realip_remote_addr: string): Promise<boolean> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        const address = await ipBlacklistRepository.findOne({
            where: {
                ip: realip_remote_addr,
                disable: false
            }
        });

        if (!address) {
            Logger.getLogger().info(`AddressAccess::_listCheckBlackList: Address(${realip_remote_addr}) not found in blacklist.`);

            return true;
        }

        Logger.getLogger().info(`AddressAccess::_listCheckBlackList: Address(${realip_remote_addr}) found in blacklist!`);

        // update and not await
        AddressAccess._updateBlacklistBlock(address.id, address.count_block + 1).then();

        return false;
    }

    /**
     * _updateBlacklistBlock
     * @param ipBlacklistId
     * @param newBlockCount
     * @protected
     */
    protected static async _updateBlacklistBlock(ipBlacklistId: number, newBlockCount: number): Promise<void> {
        const ipBlacklistRepository = DBHelper.getRepository(IpBlacklistDB);

        await ipBlacklistRepository
        .createQueryBuilder()
        .update()
        .set({
            last_block: DateHelper.getCurrentDbTime(),
            count_block: newBlockCount
        })
        .where('id = :id', {id: ipBlacklistId})
        .execute();
    }

    /**
     * _listCheckWhiteList
     * @param listenId
     * @param realip_remote_addr
     * @protected
     */
    protected async _listCheckWhiteList(listenId: number, realip_remote_addr: string): Promise<boolean> {
        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        const address = await ipWhitelistRepository.findOne({
            where: {
                ip: realip_remote_addr,
                disable: false
            }
        });

        if (address) {
            Logger.getLogger().info(`AddressAccess::_listCheckWhiteList: Address(${realip_remote_addr}) found in whitelist!`);

            // update and not await
            AddressAccess._updateWhiteListAccess(address.id, address.count_access + 1).then();

            return true;
        }

        Logger.getLogger().info(`AddressAccess::_listCheckWhiteList: Address(${realip_remote_addr}) not found in whitelist.`);

        return false;
    }

    /**
     * _updateWhiteListAccess
     * @param ipWhitelistId
     * @param newAccessCount
     * @protected
     */
    protected static async _updateWhiteListAccess(ipWhitelistId: number, newAccessCount: number): Promise<void> {
        const ipWhitelistRepository = DBHelper.getRepository(IpWhitelistDB);

        await ipWhitelistRepository
        .createQueryBuilder()
        .update()
        .set({
            last_access: DateHelper.getCurrentDbTime(),
            count_access: newAccessCount
        })
        .where('id = :id', {id: ipWhitelistId})
        .execute();
    }

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/njs/address_access',
            async(req, res) => {
                await this.access(
                    res,
                    req.header('listen_id') ?? '',
                    req.header('realip_remote_addr') ?? '',
                    req.header('remote_addr') ?? '',
                    req.header('type') ?? ''
                );
            }
        );

        return super.getExpressRouter();
    }

}
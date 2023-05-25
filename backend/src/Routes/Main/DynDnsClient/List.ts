import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {DomainService} from '../../../inc/Db/MariaDb/DomainService.js';
import {DynDnsClient as DynDnsClientDB} from '../../../inc/Db/MariaDb/Entity/DynDnsClient.js';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../../../inc/Db/MariaDb/Entity/DynDnsClientDomain.js';
import {DynDnsProviders} from '../../../inc/Provider/DynDnsProviders.js';


/**
 * DynDnsClientDomain
 */
export const SchemaDynDnsClientDomain = Vts.object({
    id: Vts.number(),
    name: Vts.string()
});

export type DynDnsClientDomain = ExtractSchemaResultType<typeof SchemaDynDnsClientDomain>;

/**
 * DynDnsClientProvider
 */
export const SchemaDynDnsClientProvider = Vts.object({
    name: Vts.string(),
    title: Vts.string()
});

/**
 * DynDnsClientData
 */
export const SchemaDynDnsClientData = Vts.object({
    id: Vts.number(),
    domains: Vts.array(SchemaDynDnsClientDomain),
    provider: SchemaDynDnsClientProvider,
    username: Vts.string(),
    password: Vts.optional(Vts.string()),
    update_domain: Vts.boolean(),
    last_status: Vts.number(),
    last_status_msg: Vts.string(),
    last_update: Vts.number()
});

export type DynDnsClientData = ExtractSchemaResultType<typeof SchemaDynDnsClientData>;

/**
 * DynDnsClientListResponse
 */
export type DynDnsClientListResponse = DefaultReturn & {
    list: DynDnsClientData[];
};

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<DynDnsClientListResponse> {
        const dyndnsclientRepository = DBHelper.getRepository(DynDnsClientDB);
        const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);

        const list: DynDnsClientData[] = [];
        const clients = await dyndnsclientRepository.find();

        if (clients) {
            for await (const client of clients) {
                const provider = DynDnsProviders.getProvider(client.provider);
                let providerName = '';
                let providerTitle = '';

                if (provider) {
                    providerName = provider.getName();
                    providerTitle = provider.getTitle();
                }

                const domains: DynDnsClientDomain[] = [];

                const domainList = await dyndnsclientDomainRepository.find({
                    where: {
                        dyndnsclient_id: client.id
                    }
                });

                if (domainList) {
                    for await (const domain of domainList) {
                        const tdomain = await DomainService.findOne(domain.domain_id);

                        if (tdomain) {
                            domains.push({
                                id: domain.domain_id,
                                name: tdomain.domainname
                            });
                        }
                    }
                }

                list.push({
                    id: client.id,
                    domains: domains,
                    provider: {
                        name: providerName,
                        title: providerTitle
                    },
                    update_domain: client.update_domain,
                    username: client.username,
                    last_status: client.last_status,
                    last_status_msg: provider?.getStatusMsg(client.last_status)!,
                    last_update: client.last_update
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}
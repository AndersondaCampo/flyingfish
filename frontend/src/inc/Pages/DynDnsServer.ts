import {
    Badge,
    BadgeType, ButtonClass, ButtonMenu, ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow, DialogConfirm,
    IconFa,
    LeftNavbarLink, ModalDialogType,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import moment from 'moment/moment';
import {Domain} from '../Api/Domain';
import {UnauthorizedError} from '../Api/Error/UnauthorizedError';
import {DynDnsServer as DynDnsServerAPI} from '../Api/DynDnsServer';
import {UtilRedirect} from '../Utils/UtilRedirect';
import {BasePage} from './BasePage';
import {DynDnsServerEditModal} from './DynDnsServer/DynDnsServerEditModal';

/**
 * DynDnsServer
 */
export class DynDnsServer extends BasePage {

    /**
     * name
     * @member {string}
     */
    protected _name: string = 'dyndnsserver';

    /**
     * dyn dns client dialog
     * @member {DynDnsServerEditModal}
     */
    protected _dynDnsServerDialog: DynDnsServerEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('DynDns-Server');

        // dyndnsclient modal ------------------------------------------------------------------------------------------

        this._dynDnsServerDialog = new DynDnsServerEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // -------------------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Account', async() => {
            this._dynDnsServerDialog.resetValues();
            this._dynDnsServerDialog.setTitle('DynDns Server Add');
            this._dynDnsServerDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm', IconFa.add);

        this._wrapper.getNavbar().getLeftNavbar().getElement().append('&nbsp;');
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());

        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle('Accounts');

        const table = new Table(card);
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Username');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Domains');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Last-Update');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

            try {
                const users = await DynDnsServerAPI.getUsers();

                if (users.list) {
                    card.setTitle(`Accounts (${users.list.length})`);

                    for (const entry of users.list) {
                        const trbody = new Tr(table.getTbody());

                        // eslint-disable-next-line no-new
                        new Td(trbody, `#${entry.user.id}`);

                        // eslint-disable-next-line no-new
                        new Td(trbody, `${entry.user.username}`);

                        const domainsTd = new Td(trbody, '');
                        domainsTd.setCss({
                            'white-space': 'normal'
                        });

                        for (const domain of entry.domains) {
                            // eslint-disable-next-line no-new
                            new Badge(domainsTd, `${domain.name}`, BadgeType.secondary);
                            domainsTd.append('&nbsp;');
                        }

                        const date = moment(entry.last_update * 1000);

                        // eslint-disable-next-line no-new
                        new Td(trbody, date.format('<b>YYYY-MM-DD</b> HH:mm:ss'));

                        const tdRAction = new Td(trbody, '');
                        const btnRMenu = new ButtonMenu(
                            tdRAction.getElement(),
                            IconFa.bars,
                            true,
                            ButtonType.borderless
                        );

                        btnRMenu.addMenuItem(
                            'Edit',
                            async(): Promise<void> => {
                                this._dynDnsServerDialog.resetValues();
                                this._dynDnsServerDialog.setTitle('DynDns Server Account Edit');
                                this._dynDnsServerDialog.show();

                                try {
                                    const domains = await Domain.getDomains();

                                    if (domains) {
                                        this._dynDnsServerDialog.setDomains(domains.list);
                                    }
                                } catch (e) {
                                    if (e instanceof UnauthorizedError) {
                                        UtilRedirect.toLogin();
                                    }
                                }

                                this._dynDnsServerDialog.setId(entry.user.id);
                                this._dynDnsServerDialog.setDomainSelected(entry.domains);
                                this._dynDnsServerDialog.setUsername(entry.user.username);
                            },
                            IconFa.edit
                        );

                        btnRMenu.addDivider();

                        btnRMenu.addMenuItem(
                            'Delete',
                            (): void => {
                                DialogConfirm.confirm(
                                    'dnydnsDeleteServer',
                                    ModalDialogType.large,
                                    'Delete accoun',
                                    'Are you sure you want to delete the account?',
                                    async(_, dialog) => {
                                        try {
                                            if (await DynDnsServerAPI.delete(entry)) {
                                                this._toast.fire({
                                                    icon: 'success',
                                                    title: 'DynDns server account delete success.'
                                                });
                                            }
                                        } catch (message) {
                                            this._toast.fire({
                                                icon: 'error',
                                                title: message
                                            });
                                        }

                                        dialog.hide();

                                        if (this._onLoadTable) {
                                            this._onLoadTable();
                                        }
                                    },
                                    undefined,
                                    'Delete',
                                    ButtonClass.danger
                                );
                            },
                            IconFa.trash
                        );
                    }
                }
            } catch (error) {
                if (error instanceof UnauthorizedError) {
                    UtilRedirect.toLogin();
                }
            }

            card.hideLoading();
        };

        // load table
        await this._onLoadTable();
    }

}
import {GatewayIdentifier as GatewayIdentifierAPI, GatewayIdentifierEntry} from '../Api/GatewayIdentifier';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {DialogConfirm} from '../Bambooo/Content/Dialog/DialogConfirm';
import {ButtonType} from '../Bambooo/Content/Form/Button';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {ModalDialogType} from '../Bambooo/Modal/ModalDialog';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {GatewayEditModal} from './Gateway/GatewayEditModal';

/**
 * Gateway
 */
export class Gateway extends BasePage {

    /**
     * name
     * @protected
     */
    protected _name: string = 'gateway';

    /**
     * gateway dialog
     * @protected
     */
    protected _gatewayDialog: GatewayEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        this.setTitle('Gateway');

        this._gatewayDialog = new GatewayEditModal(
            this._wrapper.getContentWrapper().getContent()
        );

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add Gateway', () => {
            this._gatewayDialog.resetValues();
            this._gatewayDialog.setTitle('Gateway Add');
            this._gatewayDialog.show();
            return false;
        }, 'btn btn-block btn-default btn-sm');

        // -------------------------------------------------------------------------------------------------------------

        this._gatewayDialog.setOnSave(async(): Promise<void> => {
            let tid = this._gatewayDialog.getId();

            if (tid === null) {
                tid = 0;
            }

            try {
                const gateway: GatewayIdentifierEntry = {
                    id: tid,
                    mac_address: this._gatewayDialog.getGatewayMacAddress(),
                    address: this._gatewayDialog.getGatewayIpAddress(),
                    networkname: this._gatewayDialog.getNetworkName(),
                    color: this._gatewayDialog.getColor()
                };

                if (await GatewayIdentifierAPI.save(gateway)) {
                    this._gatewayDialog.hide();

                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Gateway save success.'
                    });
                }
            } catch ({message}) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();
        const card = new Card(new ContentCol(content, ContentColSize.col12));

        /**
         * onLoadList
         */
        this._onLoadTable = async(): Promise<void> => {
            card.emptyBody();

            card.setTitle('Gateway identifiers');

            const table = new Table(card.getElement());
            const trhead = new Tr(table.getThead());

            // eslint-disable-next-line no-new
            new Th(trhead, 'Networkname');

            // eslint-disable-next-line no-new
            new Th(trhead, 'MAC');

            // eslint-disable-next-line no-new
            new Th(trhead, 'Address');

            // eslint-disable-next-line no-new
            new Th(trhead, '');

            // gateway identifiers -------------------------------------------------------------------------------------

            const gatewayIdentifiers = await GatewayIdentifierAPI.getList();

            if (gatewayIdentifiers) {
                gatewayIdentifiers.forEach((gateway) => {
                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${gateway.networkname}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${gateway.mac_address}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${gateway.address}`);

                    const tdAction = new Td(trbody, '');

                    const btnMenu = new ButtonMenu(
                        tdAction,
                        IconFa.bars,
                        true,
                        ButtonType.borderless
                    );

                    btnMenu.addMenuItem(
                        'Edit',
                        async(): Promise<void> => {
                            this._gatewayDialog.resetValues();
                            this._gatewayDialog.setTitle('Gateway Edit');
                            this._gatewayDialog.show();
                            this._gatewayDialog.setId(gateway.id);
                            this._gatewayDialog.setNetworkName(gateway.networkname);
                            this._gatewayDialog.setGatewayMacAddress(gateway.mac_address);
                            this._gatewayDialog.setGatewayIpAddress(gateway.address);
                            this._gatewayDialog.setColor(gateway.color);
                        },
                        IconFa.edit);

                    btnMenu.addDivider();

                    btnMenu.addMenuItem(
                        'Delete',
                        (): void => {
                            DialogConfirm.confirm(
                                'gatewayDelete',
                                ModalDialogType.large,
                                'Delete Upnp-Nat',
                                `Delete this Gateway identifier "${gateway.networkname}"?`,
                                async(_, dialog) => {
                                    try {
                                        if (await GatewayIdentifierAPI.delete(gateway.id)) {
                                            this._toast.fire({
                                                icon: 'success',
                                                title: 'Gateway identifier delete success.'
                                            });
                                        }
                                    } catch ({message}) {
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
                                'Delete'
                            );
                        },
                        IconFa.trash
                    );
                });
            }
        };

        // load table
        await this._onLoadTable();
    }
}
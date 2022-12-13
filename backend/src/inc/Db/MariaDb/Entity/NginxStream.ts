import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';
import {UpstreamLoadBalancingAlgorithm} from '../../../Nginx/Config/Upstream.js';

/**
 * NginxStreamDestinationType
 */
export enum NginxStreamDestinationType {
    upstream,
    listen,
    ssh_l,
    ssh_r
}

/**
 * NginxStreamSshR
 */
export enum NginxStreamSshR {
    none,
    in,
    out
}

/**
 * Nginx Stream Entity
 */
@Entity({name: 'nginx_stream'})
export class NginxStream extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * domain id
     */
    @Index()
    @Column()
    public domain_id!: number;

    /**
     * listen id
     */
    @Index()
    @Column()
    public listen_id!: number;

    /**
     * destination type
     */
    @Index()
    @Column({
        default: NginxStreamDestinationType.listen
    })
    public destination_type!: number;

    /**
     * destination listen id
     */
    @Index()
    @Column({
        default: 0
    })
    public destination_listen_id!: number;

    /**
     * index
     */
    @Column({
        default: 0
    })
    public index!: number;

    /**
     * load balancing algorithm
     */
    @Column({
        type: 'varchar',
        length: 128,
        default: UpstreamLoadBalancingAlgorithm.none
    })
    public load_balancing_algorithm!: string;

    /**
     * alias name
     */
    @Column({
        type: 'varchar',
        length: 512,
        default: ''
    })
    public alias_name!: string;

    /**
     * is default
     */
    @Column({
        default: false
    })
    public isdefault!: boolean;

    /**
     * ssh r type
     */
    @Column({
        default: NginxStreamSshR.none
    })
    public ssh_r_type!: number;

    /**
     * ssh port id (in/out for ssh-r)
     */
    @Column({
        default: 0
    })
    public sshport_id!: number;

}
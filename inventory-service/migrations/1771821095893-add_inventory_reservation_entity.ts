import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryReservationEntity1771821095893 implements MigrationInterface {
    name = 'AddInventoryReservationEntity1771821095893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`inventory_reservations\` (\`id\` varchar(36) NOT NULL, \`orderId\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_f90c89ecc0657a37d9112d3208\` (\`orderId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_f90c89ecc0657a37d9112d3208\` ON \`inventory_reservations\``);
        await queryRunner.query(`DROP TABLE \`inventory_reservations\``);
    }

}

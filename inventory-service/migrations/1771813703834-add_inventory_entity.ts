import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryEntity1771813703834 implements MigrationInterface {
    name = 'AddInventoryEntity1771813703834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`inventory_items\` (\`id\` varchar(36) NOT NULL, \`productId\` varchar(255) NOT NULL, \`availableQuantity\` int NOT NULL DEFAULT '0', \`reservedQuantity\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_4a1e232a660d7d51a13f20099b\` (\`productId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_4a1e232a660d7d51a13f20099b\` ON \`inventory_items\``);
        await queryRunner.query(`DROP TABLE \`inventory_items\``);
    }

}

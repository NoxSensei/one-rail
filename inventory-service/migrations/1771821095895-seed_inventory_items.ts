import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedInventoryItems1771821095895 implements MigrationInterface {
  name = 'SeedInventoryItems1771821095895';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`inventory_items\` (\`id\`, \`productId\`, \`availableQuantity\`, \`reservedQuantity\`)
      VALUES
        (UUID(), 'prod-abc', 100, 0),
        (UUID(), 'prod-xyz', 50,  0)
      ON DUPLICATE KEY UPDATE \`productId\` = \`productId\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`inventory_items\` WHERE \`productId\` IN ('prod-abc', 'prod-xyz')`,
    );
  }
}

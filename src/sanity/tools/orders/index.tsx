import { PackageIcon } from '@sanity/icons';
import { Button, Card, Stack, Text } from '@sanity/ui';
import type { Tool } from 'sanity';
import { OrdersTool } from './OrdersTool';

/** The Orders table, its own tab in the Admin's top bar (/admin/orders). */
export const ordersTool: Tool = {
  name: 'orders',
  title: 'Orders',
  icon: PackageIcon,
  component: OrdersTool,
};

/** Desk pane under Orders that points to the table, for anyone looking there first. */
export function OrdersTablePane() {
  return (
    <Card padding={4}>
      <Stack space={4}>
        <Text size={1}>
          Every order, unpaid checkout and open bespoke link in one live table, with customer
          names, sizes, engravings and notes. Status and tracking can be updated in the table.
        </Text>
        <Button
          as="a"
          href="/admin/orders"
          tone="primary"
          icon={PackageIcon}
          text="Open the Orders table"
          style={{ width: 'fit-content' }}
        />
      </Stack>
    </Card>
  );
}

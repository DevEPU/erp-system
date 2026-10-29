export type Menu = {
    id: number | string;
    name: string;
    icon: string;
    path: string;
    description?: string;
    external_url?: string;
    order_index?: number;
    submenus?: Menu[];
    is_active?: boolean;
    has_dashboard?: boolean;
    is_divider?: boolean;
    divider_label?: string;
    hidden?: boolean;
};

"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@sdfwa/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sdfwa/ui/components/dropdown-menu"
import { ChevronDown } from "lucide-react";

export interface AccountButtonDropdownItem {
	/**
	 * The label or content of the dropdown item
	 */
	label: string;

	/**
	 * Whether the item is disabled
	 */
	disabled?: boolean;

	/**
	 * Click handler for the dropdown item
	 */
	onClick?: () => void;

	/**
	 * Optional link URL for the dropdown item (if not using onClick)
	 */
	href?: string;
}

export interface AccountButtonDropdownGroup {
	/**
	 * The label for the dropdown group
	 */
	label?: string;

	/**
	 * The items within the dropdown group
	 */
	items: AccountButtonDropdownItem[];
}

export interface AccountButtonProps {
	/**
	 * Account first name
	 */
	firstName: string;

	/**
	 * Account last name
	 */
	lastName: string;

	/**
	 * Optional dropdown groups to display when the button is clicked
	 */
	dropdownGroups?: AccountButtonDropdownGroup[];
}

export function AccountButton(props: AccountButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
					<span className="ml-2">{props.firstName} {props.lastName}</span>
					<ChevronDown className="ml-1" />
				</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="end">
				{props.dropdownGroups?.map((group, index) => (
					<React.Fragment key={index}>
						<DropdownMenuGroup>
							{group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
							{group.items.map((item, itemIndex) => (
								<DropdownMenuItem 
									key={itemIndex} 
									disabled={item.disabled} 
									onSelect={item.onClick}
									asChild={!!item.href}
								>
									{item.href ? (
										<Link href={item.href}>
											{item.label}
										</Link>
									) : item.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
						{index < (props?.dropdownGroups?.length || 0) - 1 && <DropdownMenuSeparator />}
					</React.Fragment>
				))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

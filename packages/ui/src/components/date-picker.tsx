"use client"

import * as React from "react"
import { Calendar } from "@sdfwa/ui/components/calendar"
import { Field, FieldLabel } from "@sdfwa/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@sdfwa/ui/components/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@sdfwa/ui/components/popover"
import { CalendarIcon, IdCardIcon } from "lucide-react"

function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false
  }
  return !isNaN(date.getTime())
}

export function DatePickerInput({
  id
}: Readonly<{ id: string }>) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    new Date()
  )
  const [month, setMonth] = React.useState<Date | undefined>(date)
  const [value, setValue] = React.useState(formatDate(date))

  const placeHolder = formatDate(new Date());

  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        value={value}
        placeholder={placeHolder}
        onChange={(e) => {
          const date = new Date(e.target.value)
          setValue(e.target.value)
          if (isValidDate(date)) {
            setDate(date)
            setMonth(date)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <InputGroupButton
              id="date-picker"
              variant="ghost"
              size="icon-xs"
              aria-label="Select date"
            >
              <CalendarIcon />
              <span className="sr-only">Select date</span>
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={date}
              month={month}
              onMonthChange={setMonth}
              onSelect={(date) => {
                setDate(date)
                setValue(formatDate(date))
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}

export function DateRangePickerInput({
  id
}: Readonly<{ id: string }>) {
  const weekFromNow = new Date()
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  const [open, setOpen] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<{
    from: Date
    to?: Date
  }>({ from: new Date(), to: weekFromNow })
  const [month, setMonth] = React.useState<Date | undefined>(new Date())
  const [value, setValue] = React.useState("")

  const handleDateRangeChange = (range: { from: Date; to?: Date } | undefined) => {
    if (!range) {
      setDateRange({})
      setValue("")
      return
    }

    setDateRange(range)

    const fromStr = range.from ? formatDate(range.from) : ""
    const toStr = range.to ? formatDate(range.to) : ""

    if (fromStr && toStr) {
      setValue(`${fromStr} - ${toStr}`)
      setOpen(false)
    } else if (fromStr) {
      setValue(fromStr)
    }
  }

  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        value={value}
        placeholder="Select date range"
        onChange={(e) => {
          setValue(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <InputGroupButton
              id="date-range-picker"
              variant="ghost"
              size="icon-xs"
              aria-label="Select date range"
            >
              <CalendarIcon />
              <span className="sr-only">Select date range</span>
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="range"
              required
              selected={dateRange}
              month={month}
              onMonthChange={setMonth}
              onSelect={handleDateRangeChange}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}
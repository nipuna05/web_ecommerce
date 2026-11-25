import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, OptionalAuthGuard, type AuthedRequest } from "../auth/auth.guard";
import { CreateOrderDto } from "./create-order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Guests and signed-in customers can order; a valid login links the order to the account. */
  @Post()
  @UseGuards(OptionalAuthGuard)
  create(@Body() dto: CreateOrderDto, @Req() req: AuthedRequest) {
    return this.orders.create(dto, req.user?.id ?? null);
  }

  // Declared before ":code" so "mine" is not treated as an order code.
  @Get("mine")
  @UseGuards(AuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.orders.listForUser(req.user!.id);
  }

  @Get(":code")
  find(@Param("code") code: string, @Query("email") email: string) {
    return this.orders.find(code, email);
  }
}

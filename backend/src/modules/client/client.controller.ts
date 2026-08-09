import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { GetClientUseCase } from './application/use-cases/get-client.use-case';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case';
import { DeleteClientUseCase } from './application/use-cases/delete-client.use-case';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientController {
  constructor(
    private readonly getClient: GetClientUseCase,
    private readonly listClients: ListClientsUseCase,
    private readonly createClient: CreateClientUseCase,
    private readonly updateClient: UpdateClientUseCase,
    private readonly deleteClient: DeleteClientUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List clients' })
  @RequirePermission(Permissions.Clients.Read)
  async list() {
    const result = await this.listClients.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by id' })
  @RequirePermission(Permissions.Clients.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getClient.execute(id);
    const client = result.getValue();
    if (!client) throw new NotFoundException('Client not found');
    return { client };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a client' })
  @RequirePermission(Permissions.Clients.Create)
  async create(@Body() dto: CreateClientDto) {
    const result = await this.createClient.execute({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      contactPerson: dto.contactPerson,
      joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create client');
    return { client: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client' })
  @RequirePermission(Permissions.Clients.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    const result = await this.updateClient.execute({
      id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      contactPerson: dto.contactPerson,
      joinDate: dto.joinDate !== undefined ? new Date(dto.joinDate) : undefined,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update client');
    return { client: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a client' })
  @RequirePermission(Permissions.Clients.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteClient.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete client');
  }
}

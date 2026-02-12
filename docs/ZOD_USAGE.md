# Использование Zod на Frontend (Angular)

> Документация по использованию Shared Zod схем в Angular приложении

---

## 📋 Содержание

- [Введение](#введение)
- [Shared Zod Schemas](#shared-zod-schemas)
- [Интеграция с Angular Reactive Forms](#интеграция-с-angular-reactive-forms)
- [Валидация API responses](#валидация-api-responses)
- [Best Practices](#best-practices)

---

## 🎯 Введение

**Zod** используется для:
- ✅ Валидации форм (client-side validation)
- ✅ Валидации responses от API
- ✅ Type-safe форм с автоматическим выводом типов
- ✅ **Shared schemas** между frontend и backend

**Важно:** Zod схемы находятся в `libs/shared` и используются НА ОБОИХ frontend и backend.

---

## 📦 Shared Zod Schemas

### Где находятся схемы?

```text
libs/shared/src/lib/schemas/
├── auth/
│   ├── register.schema.ts    # RegisterRequestSchema
│   ├── login.schema.ts       # LoginRequestSchema
│   └── user.schema.ts        # UserPublicSchema
├── rooms/
│   ├── room.schema.ts
│   └── create-room.schema.ts
└── index.ts
```

### Import схем

```typescript
// В Angular компонентах/сервисах
import {
  LoginRequestSchema,
  LoginResponseSchema,
  type LoginRequest,
  type LoginResponse,
} from '@org/shared/schemas';
```

**См. подробнее:** [SHARED_ZOD_SCHEMAS.md](./SHARED_ZOD_SCHEMAS.md)

---

## 🔗 Интеграция с Angular Reactive Forms

### Пример: Login Form

```typescript
// apps/web/src/app/features/auth/components/login/login.component.ts
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ZodError } from 'zod';

// Import из shared library
import {
  LoginRequestSchema,
  type LoginRequest,
} from '@org/shared/schemas';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      // Валидация с Zod (схема из shared library)
      const loginData: LoginRequest = LoginRequestSchema.parse(this.form.value);

      this.loading.set(true);
      this.error.set(null);

      // Отправка на backend
      // TODO: вызов API service
      console.log('Valid data:', loginData);

    } catch (err) {
      if (err instanceof ZodError) {
        // Показ первой ошибки валидации
        const firstError = err.errors[0];
        this.error.set(`${firstError.path.join('.')}: ${firstError.message}`);
      } else {
        this.error.set('Ошибка валидации');
      }
    }
  }

  // Получение ошибок для конкретного поля
  getFieldError(field: string): string | null {
    const control = this.form.get(field);
    if (control?.invalid && control?.touched) {
      if (control.errors?.['required']) return 'Поле обязательно';
      if (control.errors?.['email']) return 'Некорректный email';
      if (control.errors?.['minlength']) {
        const min = control.errors['minlength'].requiredLength;
        return `Минимум ${min} символов`;
      }
    }
    return null;
  }
}
```

### Template

```html
<!-- apps/web/src/app/features/auth/components/login/login.component.html -->
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <div class="form-group">
    <label for="email">Email</label>
    <input
      id="email"
      type="email"
      formControlName="email"
      [class.error]="form.get('email')?.invalid && form.get('email')?.touched"
    />
    @if (getFieldError('email')) {
      <span class="error-message">{{ getFieldError('email') }}</span>
    }
  </div>

  <div class="form-group">
    <label for="password">Пароль</label>
    <input
      id="password"
      type="password"
      formControlName="password"
      [class.error]="form.get('password')?.invalid && form.get('password')?.touched"
    />
    @if (getFieldError('password')) {
      <span class="error-message">{{ getFieldError('password') }}</span>
    }
  </div>

  @if (error()) {
    <div class="alert alert-error">{{ error() }}</div>
  }

  <button type="submit" [disabled]="loading()">
    {{ loading() ? 'Вход...' : 'Войти' }}
  </button>
</form>
```

---

## 🌐 Валидация API responses

### API Service с Zod

```typescript
// apps/web/src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { z, ZodSchema, ZodError } from 'zod';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // GET с валидацией response
  get<T>(url: string, schema: ZodSchema<T>): Observable<T> {
    return this.http
      .get(`${this.baseUrl}${url}`)
      .pipe(map(response => this.validate(response, schema)));
  }

  // POST с валидацией response
  post<T>(url: string, body: any, schema: ZodSchema<T>): Observable<T> {
    return this.http
      .post(`${this.baseUrl}${url}`, body)
      .pipe(map(response => this.validate(response, schema)));
  }

  // PATCH с валидацией response
  patch<T>(url: string, body: any, schema: ZodSchema<T>): Observable<T> {
    return this.http
      .patch(`${this.baseUrl}${url}`, body)
      .pipe(map(response => this.validate(response, schema)));
  }

  // DELETE
  delete(url: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${url}`);
  }

  private validate<T>(response: unknown, schema: ZodSchema<T>): T {
    try {
      return schema.parse(response);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('API Response validation error:', error.errors);
        throw new Error('Некорректный ответ от сервера');
      }
      throw error;
    }
  }
}
```

### Использование в сервисе

```typescript
// apps/web/src/app/features/auth/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

// Import из shared library
import {
  LoginRequest,
  LoginResponse,
  LoginResponseSchema,
  RegisterRequest,
  RegisterResponse,
  RegisterResponseSchema,
} from '@org/shared/schemas';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private api: ApiService) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.api.post('/auth/login', data, LoginResponseSchema);
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.api.post('/auth/register', data, RegisterResponseSchema);
  }
}
```

---

## 📝 Доступные схемы

### Auth Schemas

```typescript
import {
  // Request/Response
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,

  // Types
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
  type UserPublic,
  type Role,
} from '@org/shared/schemas';
```

### Room Schemas

```typescript
import {
  // Schemas
  RoomSchema,
  RoomWithOwnerSchema,
  CreateRoomRequestSchema,
  CreateRoomResponseSchema,

  // Types
  type Room,
  type RoomWithOwner,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type RoomStatus,
} from '@org/shared/schemas';
```

**Полный список схем:** см. [SHARED_ZOD_SCHEMAS.md](./SHARED_ZOD_SCHEMAS.md)

---

## ✅ Best Practices

### 1. Всегда используйте Shared схемы

```typescript
// ✅ Хорошо - используем схемы из libs/shared
import { LoginRequestSchema } from '@org/shared/schemas';

// ❌ Плохо - создаем локальные схемы в компонентах
const LoginSchema = z.object({ ... });
```

### 2. Используйте type imports

```typescript
// ✅ Хорошо - type import (убирается при компиляции)
import { type LoginRequest } from '@org/shared/schemas';

// ⚠️ Допустимо, но не оптимально
import { LoginRequest } from '@org/shared/schemas';
```

### 3. Трансформации

```typescript
// Автоматическая трансформация данных
const DateSchema = z.string().transform((str) => new Date(str));

const NumberSchema = z.string().transform((str) => Number(str));

// Пример
const FormSchema = z.object({
  date: z.string().datetime().transform((str) => new Date(str)),
  age: z.string().transform(Number).pipe(z.number().min(18)),
});
```

### 4. Кастомные ошибки

```typescript
const PasswordSchema = z
  .string()
  .min(8, { message: 'Пароль должен содержать минимум 8 символов' })
  .max(72, { message: 'Пароль слишком длинный' })
  .refine(
    (val) => /[A-Z]/.test(val),
    { message: 'Должна быть хотя бы одна заглавная буква' }
  );
```

### 5. Использование .safeParse()

```typescript
// ✅ Хорошо (не бросает исключение)
const result = LoginSchema.safeParse(formData);

if (result.success) {
  const data = result.data;
} else {
  const errors = result.error.errors;
}

// ❌ Плохо (бросает исключение, нужен try-catch)
const data = LoginSchema.parse(formData);
```

### 6. Type inference

```typescript
// Автоматический вывод типов
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// TypeScript тип выводится автоматически
type User = z.infer<typeof UserSchema>;
// { id: string; name: string; }
```

---

## 🚫 Что НЕ делать

### ❌ Не дублируйте валидацию

```typescript
// ❌ Плохо - дублирование
this.form = this.fb.group({
  email: ['', [Validators.required, Validators.email, Validators.minLength(5)]],
});

const result = EmailSchema.parse(this.form.value.email);

// ✅ Хорошо - только Zod
this.form = this.fb.group({
  email: [''], // Без Angular validators
});

const result = EmailSchema.safeParse(this.form.value.email);
```

### ❌ Не используйте Zod для backend валидации

```typescript
// ❌ Плохо - Zod схемы отправляются на backend
// Zod работает только на frontend!

// ✅ Хорошо - backend использует express-validator
// apps/backend - используйте express-validator
```

### ❌ Не игнорируйте ошибки валидации

```typescript
// ❌ Плохо
try {
  const data = Schema.parse(formData);
} catch (err) {
  // Игнорируем ошибку
}

// ✅ Хорошо
const result = Schema.safeParse(formData);
if (!result.success) {
  this.error.set(result.error.errors[0].message);
}
```

---

## 📚 Дополнительные ресурсы

- [Zod Documentation](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)
- [Angular Reactive Forms](https://angular.dev/guide/forms/reactive-forms)

---

**Последнее обновление:** 2025-01-29

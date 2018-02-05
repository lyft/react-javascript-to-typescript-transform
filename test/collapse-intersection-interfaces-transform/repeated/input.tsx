type A = { foo: string; } & { foo: string; };

type B = { foo: string; bar: number; } & { foo: number; bar: number; }

type C = { foo: string; bar: number; } & { foo: number; bar: number; } & { foo: string; }

import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            {status && (
                <div className="mb-4 text-sm font-medium text-[#00e5b8]">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} />
                </div>

                <div className="mt-5">
                    <InputLabel htmlFor="password" value="Mot de passe" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} />
                </div>

                <div className="mt-5 block">
                    <label className="flex items-center cursor-pointer group">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                        />
                        <span className="ms-2 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                            Se souvenir de moi
                        </span>
                    </label>
                </div>

                <div className="mt-8 flex flex-col gap-4">
                    <PrimaryButton disabled={processing}>
                        Connexion
                    </PrimaryButton>

                    <div className="flex items-center justify-between mt-2">
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-sm text-slate-400 hover:text-[#00e5b8] transition-colors focus:outline-none"
                            >
                                Mot de passe oublié ?
                            </Link>
                        )}

                        <Link
                            href={route('register')}
                            className="text-sm text-slate-400 hover:text-[#00e5b8] transition-colors focus:outline-none"
                        >
                            Créer un compte
                        </Link>
                    </div>
                </div>
            </form>
        </GuestLayout>
    );
}

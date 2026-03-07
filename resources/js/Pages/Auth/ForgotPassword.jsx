import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="mb-6 text-sm text-slate-400 leading-relaxed font-sans">
                Mot de passe oublié ? Aucun problème. Indiquez-nous votre adresse email et nous vous enverrons un lien de réinitialisation.
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-[#00e5b8]">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <TextInput
                    id="email"
                    type="email"
                    name="email"
                    value={data.email}
                    className="mt-1 block w-full"
                    isFocused={true}
                    onChange={(e) => setData('email', e.target.value)}
                />

                <InputError message={errors.email} />

                <div className="mt-8">
                    <PrimaryButton disabled={processing}>
                        Envoyer le lien de réinitialisation
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}

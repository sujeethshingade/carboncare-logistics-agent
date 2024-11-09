import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/assets/logo.png';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

export const Header = () => {
    const router = useRouter();
    const { user } = useAuth();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    return (
        <header className="container text-white py-2">
            <div className="mx-auto flex justify-between items-center py-2 border-b border-white">
                <div className="flex items-center">
                    <Image
                        src={Logo}
                        alt="CarbonCare Logo"
                        width={50}
                        height={50}
                        className="mr-2 mb-2"
                        priority
                    />
                    <h1 className="text-2xl font-bold">
                        <Link href="/">
                            CarbonCare
                        </Link>
                    </h1>
                </div>
                <nav>
                    <ul className="flex space-x-6 font-semibold">
                        {!user ? (
                            <>
                                <li>
                                    <Link href="/signup" className="hover:text-gray-400">
                                        Signup
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/login" className="hover:text-gray-400">
                                        Login
                                    </Link>
                                </li>
                            </>
                        ) : (
                            <>
                                <li>
                                    <button
                                        onClick={handleSignOut}
                                        className="hover:text-gray-400"
                                    >
                                        Logout
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
};
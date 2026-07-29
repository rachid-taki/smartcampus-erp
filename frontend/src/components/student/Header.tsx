import { Bell, Search } from "lucide-react";

export default function Header() {
    return (

        <header className="bg-white h-20 shadow-sm flex items-center justify-between px-8">

            <div>

                <h2 className="text-2xl font-bold">
                    Bonjour Rachid 👋
                </h2>

                <p className="text-gray-500">
                    Bienvenue sur votre portail étudiant.
                </p>

            </div>

            <div className="flex items-center gap-5">

                <div className="relative">

                    <Search
                        className="absolute left-3 top-3"
                        size={18}
                    />

                    <input
                        placeholder="Rechercher..."
                        className="pl-10 pr-5 h-11 rounded-xl border w-72 outline-none"
                    />

                </div>

                <button className="relative">

                    <Bell />

                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500"/>

                </button>

                <img
                    src="https://i.pravatar.cc/150"
                    className="h-11 w-11 rounded-full"
                />

            </div>

        </header>

    );
}
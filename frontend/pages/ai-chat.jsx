import Head from 'next/head';
import StoneHavenChat from '../components/StoneHavenChat';

export default function AiChatPage() {
    return (
        <>
            <Head>
                <title>Countertop Project Chat | Urban Stone Collective</title>
                <meta name="description" content="Chat with Urban Stone Collective about your quartz, granite, or quartzite countertop project in Greater Cincinnati and Northern Kentucky." />
                <meta name="robots" content="noindex,follow" />
            </Head>
            <StoneHavenChat />
        </>
    );
}

export async function getServerSideProps() {
    return {
        props: {},
    };
}

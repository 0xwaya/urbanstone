import StoneHavenChat from '../components/StoneHavenChat';

export default function AiChatPage() {
    return <StoneHavenChat />;
}

export async function getServerSideProps() {
    return {
        props: {},
    };
}

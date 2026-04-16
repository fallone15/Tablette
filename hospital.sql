--
-- PostgreSQL database dump
--

\restrict snoaNYoZxAqPf7l5LyHZ3OzB8HaSBJ63y5PCFp1YaSSS67L47PFo2bTILunW6Pw

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-04-09 10:06:11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 242 (class 1259 OID 18484)
-- Name: constantes_vitales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.constantes_vitales (
    id_constante integer NOT NULL,
    id_patient integer NOT NULL,
    id_consultation integer,
    rendez_vous_id integer,
    temperature numeric(4,2),
    frequence_cardiaque integer,
    spo2 integer,
    tension_systolique integer,
    tension_diastolique integer,
    "timestamp" timestamp without time zone DEFAULT now(),
    source character varying(50) DEFAULT 'borne_accueil'::character varying
);


ALTER TABLE public.constantes_vitales OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 18483)
-- Name: constantes_vitales_id_constante_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.constantes_vitales_id_constante_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.constantes_vitales_id_constante_seq OWNER TO postgres;

--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 241
-- Name: constantes_vitales_id_constante_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.constantes_vitales_id_constante_seq OWNED BY public.constantes_vitales.id_constante;


--
-- TOC entry 232 (class 1259 OID 18340)
-- Name: consultations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultations (
    id_consultation integer NOT NULL,
    id_patient integer NOT NULL,
    id_member integer,
    id_service integer NOT NULL,
    id_medecin integer,
    id_salle integer,
    numero_file character varying(20) NOT NULL,
    heure_arrivee timestamp without time zone DEFAULT now(),
    heure_estimee timestamp without time zone,
    heure_debut timestamp without time zone,
    heure_fin timestamp without time zone,
    statut character varying(20) DEFAULT 'en_attente'::character varying,
    motif text,
    observations text,
    diagnostic text,
    notes text,
    fichiers jsonb,
    montant_paye numeric(6,2),
    mode_paiement character varying(20),
    CONSTRAINT consultations_mode_paiement_check CHECK (((mode_paiement)::text = ANY ((ARRAY['CB'::character varying, 'especes'::character varying, 'mutuelle'::character varying, 'cheque'::character varying, 'stripe'::character varying])::text[]))),
    CONSTRAINT consultations_statut_check CHECK (((statut)::text = ANY ((ARRAY['en_attente'::character varying, 'en_cours'::character varying, 'terminee'::character varying, 'annulee'::character varying])::text[])))
);


ALTER TABLE public.consultations OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 18339)
-- Name: consultations_id_consultation_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consultations_id_consultation_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consultations_id_consultation_seq OWNER TO postgres;

--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 231
-- Name: consultations_id_consultation_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consultations_id_consultation_seq OWNED BY public.consultations.id_consultation;


--
-- TOC entry 236 (class 1259 OID 18417)
-- Name: disponibilites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disponibilites (
    id_dispo integer NOT NULL,
    medecin_id integer NOT NULL,
    jour_semaine integer NOT NULL,
    heure_debut time without time zone NOT NULL,
    heure_fin time without time zone NOT NULL,
    CONSTRAINT disponibilites_jour_semaine_check CHECK (((jour_semaine >= 0) AND (jour_semaine <= 6)))
);


ALTER TABLE public.disponibilites OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 18416)
-- Name: disponibilites_id_dispo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disponibilites_id_dispo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disponibilites_id_dispo_seq OWNER TO postgres;

--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 235
-- Name: disponibilites_id_dispo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disponibilites_id_dispo_seq OWNED BY public.disponibilites.id_dispo;


--
-- TOC entry 224 (class 1259 OID 18262)
-- Name: family_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.family_members (
    id_member integer NOT NULL,
    id_titulaire integer NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    date_naissance date NOT NULL,
    sexe character varying(10),
    lien character varying(50),
    tuteur character varying(100),
    allergies text[],
    groupe_sanguin character varying(5),
    actif boolean DEFAULT true,
    date_ajout timestamp without time zone DEFAULT now(),
    CONSTRAINT family_members_sexe_check CHECK (((sexe)::text = ANY ((ARRAY['homme'::character varying, 'femme'::character varying, 'autre'::character varying])::text[])))
);


ALTER TABLE public.family_members OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 18261)
-- Name: family_members_id_member_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.family_members_id_member_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.family_members_id_member_seq OWNER TO postgres;

--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 223
-- Name: family_members_id_member_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.family_members_id_member_seq OWNED BY public.family_members.id_member;


--
-- TOC entry 240 (class 1259 OID 18465)
-- Name: fichiers_medicaux; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fichiers_medicaux (
    id_fichier integer NOT NULL,
    id_resultat integer,
    type_fichier character varying(20),
    nom_fichier character varying(255) NOT NULL,
    chemin_stockage text NOT NULL,
    taille_ko integer,
    date_upload timestamp without time zone DEFAULT now(),
    CONSTRAINT fichiers_medicaux_type_fichier_check CHECK (((type_fichier)::text = ANY ((ARRAY['image'::character varying, 'pdf'::character varying, 'dicom'::character varying, 'autre'::character varying])::text[])))
);


ALTER TABLE public.fichiers_medicaux OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 18464)
-- Name: fichiers_medicaux_id_fichier_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fichiers_medicaux_id_fichier_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fichiers_medicaux_id_fichier_seq OWNER TO postgres;

--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 239
-- Name: fichiers_medicaux_id_fichier_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fichiers_medicaux_id_fichier_seq OWNED BY public.fichiers_medicaux.id_fichier;


--
-- TOC entry 228 (class 1259 OID 18298)
-- Name: medecins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medecins (
    id_medecin integer NOT NULL,
    carte_rfid character varying(20) NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    specialite character varying(100),
    id_service integer,
    telephone character varying(20),
    sexe character varying(10),
    email character varying(100),
    code_pin character varying(255),
    disponible boolean DEFAULT true,
    date_embauche date,
    actif boolean DEFAULT true,
    CONSTRAINT medecins_sexe_check CHECK (((sexe)::text = ANY ((ARRAY['homme'::character varying, 'femme'::character varying, 'autre'::character varying])::text[])))
);


ALTER TABLE public.medecins OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 18297)
-- Name: medecins_id_medecin_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.medecins_id_medecin_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medecins_id_medecin_seq OWNER TO postgres;

--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 227
-- Name: medecins_id_medecin_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.medecins_id_medecin_seq OWNED BY public.medecins.id_medecin;


--
-- TOC entry 248 (class 1259 OID 18564)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    titre character varying(100) NOT NULL,
    message text NOT NULL,
    type character varying(50),
    lu boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 18563)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 247
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 244 (class 1259 OID 18510)
-- Name: ordonnances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ordonnances (
    id_ordonnance integer NOT NULL,
    id_consultation integer,
    rendez_vous_id integer,
    id_medecin integer NOT NULL,
    date_prescription timestamp without time zone DEFAULT now(),
    medicaments jsonb NOT NULL,
    posologie text,
    duree_traitement integer,
    instructions text,
    envoyee_electronique boolean DEFAULT false,
    chemin_pdf text,
    statut_pdf character varying(20) DEFAULT 'non_genere'::character varying,
    date_generation timestamp without time zone,
    CONSTRAINT ordonnances_statut_pdf_check CHECK (((statut_pdf)::text = ANY ((ARRAY['non_genere'::character varying, 'genere'::character varying, 'erreur'::character varying])::text[])))
);


ALTER TABLE public.ordonnances OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 18509)
-- Name: ordonnances_id_ordonnance_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ordonnances_id_ordonnance_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ordonnances_id_ordonnance_seq OWNER TO postgres;

--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 243
-- Name: ordonnances_id_ordonnance_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ordonnances_id_ordonnance_seq OWNED BY public.ordonnances.id_ordonnance;


--
-- TOC entry 246 (class 1259 OID 18539)
-- Name: paiements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paiements (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    rendez_vous_id integer,
    montant numeric(10,2) NOT NULL,
    methode_paiement character varying(50) NOT NULL,
    statut character varying(20) DEFAULT 'en_attente'::character varying,
    stripe_payment_id character varying(255),
    description text,
    date_paiement timestamp without time zone DEFAULT now()
);


ALTER TABLE public.paiements OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 18538)
-- Name: paiements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.paiements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.paiements_id_seq OWNER TO postgres;

--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 245
-- Name: paiements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.paiements_id_seq OWNED BY public.paiements.id;


--
-- TOC entry 222 (class 1259 OID 18237)
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id_patient integer NOT NULL,
    carte_rfid character varying(20) NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    date_naissance date NOT NULL,
    sexe character varying(10),
    adresse text,
    code_postal character varying(10),
    ville character varying(100),
    email character varying(100),
    telephone character varying(20),
    cin character varying(20),
    numero_secu character varying(25),
    mutuelle character varying(100),
    groupe_sanguin character varying(5),
    allergies text[],
    code_pin character varying(255) NOT NULL,
    medecin_traitant character varying(100),
    date_inscription timestamp without time zone DEFAULT now(),
    email_verified boolean DEFAULT false,
    verification_token character varying(255),
    verification_token_expires timestamp without time zone,
    actif boolean DEFAULT true,
    photo_url character varying(255),
    CONSTRAINT patients_sexe_check CHECK (((sexe)::text = ANY ((ARRAY['homme'::character varying, 'femme'::character varying, 'autre'::character varying])::text[])))
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 18236)
-- Name: patients_id_patient_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patients_id_patient_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_patient_seq OWNER TO postgres;

--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 221
-- Name: patients_id_patient_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patients_id_patient_seq OWNED BY public.patients.id_patient;


--
-- TOC entry 220 (class 1259 OID 18220)
-- Name: pending_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pending_registrations (
    id integer NOT NULL,
    email character varying(100) NOT NULL,
    verification_token character varying(255) NOT NULL,
    verification_token_expires timestamp without time zone NOT NULL,
    registration_data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.pending_registrations OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 18219)
-- Name: pending_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pending_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pending_registrations_id_seq OWNER TO postgres;

--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 219
-- Name: pending_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pending_registrations_id_seq OWNED BY public.pending_registrations.id;


--
-- TOC entry 234 (class 1259 OID 18384)
-- Name: rendez_vous; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rendez_vous (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    id_member integer,
    medecin_id integer NOT NULL,
    date_rdv date NOT NULL,
    heure_rdv time without time zone NOT NULL,
    motif text,
    statut character varying(30) DEFAULT 'en_attente'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    montant_total numeric(10,2),
    CONSTRAINT rendez_vous_statut_check CHECK (((statut)::text = ANY ((ARRAY['en_attente'::character varying, 'en_attente_paiement'::character varying, 'confirme'::character varying, 'annule'::character varying, 'termine'::character varying])::text[])))
);


ALTER TABLE public.rendez_vous OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 18383)
-- Name: rendez_vous_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rendez_vous_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rendez_vous_id_seq OWNER TO postgres;

--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 233
-- Name: rendez_vous_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rendez_vous_id_seq OWNED BY public.rendez_vous.id;


--
-- TOC entry 238 (class 1259 OID 18437)
-- Name: resultats_examens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resultats_examens (
    id_resultat integer NOT NULL,
    id_consultation integer,
    rendez_vous_id integer,
    id_patient integer NOT NULL,
    type_examen character varying(100) NOT NULL,
    date_examen timestamp without time zone DEFAULT now(),
    compte_rendu text,
    conclusion text,
    medecin_responsable character varying(100),
    fichiers_joints jsonb
);


ALTER TABLE public.resultats_examens OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 18436)
-- Name: resultats_examens_id_resultat_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resultats_examens_id_resultat_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resultats_examens_id_resultat_seq OWNER TO postgres;

--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 237
-- Name: resultats_examens_id_resultat_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resultats_examens_id_resultat_seq OWNED BY public.resultats_examens.id_resultat;


--
-- TOC entry 230 (class 1259 OID 18321)
-- Name: salles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salles (
    id_salle integer NOT NULL,
    numero_salle character varying(10) NOT NULL,
    batiment character varying(10),
    etage integer,
    id_service integer,
    occupee boolean DEFAULT false,
    capacite integer DEFAULT 1,
    equipements text[],
    derniere_utilisation timestamp without time zone,
    actif boolean DEFAULT true
);


ALTER TABLE public.salles OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 18320)
-- Name: salles_id_salle_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salles_id_salle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salles_id_salle_seq OWNER TO postgres;

--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 229
-- Name: salles_id_salle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salles_id_salle_seq OWNED BY public.salles.id_salle;


--
-- TOC entry 226 (class 1259 OID 18284)
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id_service integer NOT NULL,
    nom character varying(100) NOT NULL,
    description text,
    tarif numeric(6,2) NOT NULL,
    duree_moyenne integer NOT NULL,
    actif boolean DEFAULT true
);


ALTER TABLE public.services OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 18283)
-- Name: services_id_service_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_id_service_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_id_service_seq OWNER TO postgres;

--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 225
-- Name: services_id_service_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_id_service_seq OWNED BY public.services.id_service;


--
-- TOC entry 4956 (class 2604 OID 18487)
-- Name: constantes_vitales id_constante; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.constantes_vitales ALTER COLUMN id_constante SET DEFAULT nextval('public.constantes_vitales_id_constante_seq'::regclass);


--
-- TOC entry 4944 (class 2604 OID 18343)
-- Name: consultations id_consultation; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations ALTER COLUMN id_consultation SET DEFAULT nextval('public.consultations_id_consultation_seq'::regclass);


--
-- TOC entry 4951 (class 2604 OID 18420)
-- Name: disponibilites id_dispo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilites ALTER COLUMN id_dispo SET DEFAULT nextval('public.disponibilites_id_dispo_seq'::regclass);


--
-- TOC entry 4932 (class 2604 OID 18265)
-- Name: family_members id_member; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members ALTER COLUMN id_member SET DEFAULT nextval('public.family_members_id_member_seq'::regclass);


--
-- TOC entry 4954 (class 2604 OID 18468)
-- Name: fichiers_medicaux id_fichier; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichiers_medicaux ALTER COLUMN id_fichier SET DEFAULT nextval('public.fichiers_medicaux_id_fichier_seq'::regclass);


--
-- TOC entry 4937 (class 2604 OID 18301)
-- Name: medecins id_medecin; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medecins ALTER COLUMN id_medecin SET DEFAULT nextval('public.medecins_id_medecin_seq'::regclass);


--
-- TOC entry 4966 (class 2604 OID 18567)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4959 (class 2604 OID 18513)
-- Name: ordonnances id_ordonnance; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordonnances ALTER COLUMN id_ordonnance SET DEFAULT nextval('public.ordonnances_id_ordonnance_seq'::regclass);


--
-- TOC entry 4963 (class 2604 OID 18542)
-- Name: paiements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements ALTER COLUMN id SET DEFAULT nextval('public.paiements_id_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 18240)
-- Name: patients id_patient; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients ALTER COLUMN id_patient SET DEFAULT nextval('public.patients_id_patient_seq'::regclass);


--
-- TOC entry 4926 (class 2604 OID 18223)
-- Name: pending_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_registrations ALTER COLUMN id SET DEFAULT nextval('public.pending_registrations_id_seq'::regclass);


--
-- TOC entry 4947 (class 2604 OID 18387)
-- Name: rendez_vous id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rendez_vous ALTER COLUMN id SET DEFAULT nextval('public.rendez_vous_id_seq'::regclass);


--
-- TOC entry 4952 (class 2604 OID 18440)
-- Name: resultats_examens id_resultat; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resultats_examens ALTER COLUMN id_resultat SET DEFAULT nextval('public.resultats_examens_id_resultat_seq'::regclass);


--
-- TOC entry 4940 (class 2604 OID 18324)
-- Name: salles id_salle; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salles ALTER COLUMN id_salle SET DEFAULT nextval('public.salles_id_salle_seq'::regclass);


--
-- TOC entry 4935 (class 2604 OID 18287)
-- Name: services id_service; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services ALTER COLUMN id_service SET DEFAULT nextval('public.services_id_service_seq'::regclass);


--
-- TOC entry 5228 (class 0 OID 18484)
-- Dependencies: 242
-- Data for Name: constantes_vitales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.constantes_vitales (id_constante, id_patient, id_consultation, rendez_vous_id, temperature, frequence_cardiaque, spo2, tension_systolique, tension_diastolique, "timestamp", source) FROM stdin;
\.


--
-- TOC entry 5218 (class 0 OID 18340)
-- Dependencies: 232
-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultations (id_consultation, id_patient, id_member, id_service, id_medecin, id_salle, numero_file, heure_arrivee, heure_estimee, heure_debut, heure_fin, statut, motif, observations, diagnostic, notes, fichiers, montant_paye, mode_paiement) FROM stdin;
3	2	\N	4	2	\N	C-0CDX9G	2026-04-08 22:32:05.82759	\N	2026-04-08 21:31:08.644	2026-04-08 21:32:05.704	terminee	Douleurs abdominales	aze rz"  rztrdy rtrdt 	juste des maux de tete	\N	\N	\N	\N
4	2	\N	4	2	\N	C-Y2X0SI	2026-04-08 23:00:40.537446	\N	2026-04-08 21:59:28.958	2026-04-08 22:00:40.427	terminee	SFDGCH   Douleurs abdominales	T7Y88888888888888     YYYYYY	DFFFFFFFFFFFFFD     FFFFFFFFFFFFFFFFFFFF	\N	\N	\N	\N
5	2	\N	4	2	\N	C-SJUBZ8	2026-04-08 23:11:21.96893	\N	2026-04-08 22:08:04.085	2026-04-08 22:11:21.878	terminee	sdfggggggggggggggggggggggg	ssssssssssssssssss dffffffffffffffffffffffffffg gggggggggggg	dddddddddddddddddddddddddddddddd	\N	\N	\N	\N
6	2	\N	4	2	\N	C-QY7AVM	2026-04-08 23:12:37.183536	\N	2026-04-08 22:11:48.367	2026-04-08 22:12:37.003	terminee	Douleurs abdominales	revenir dans 1 semaine pour controle de routine	RIEN DE GRAVE? JUSTE LE REPOS	\N	\N	\N	\N
7	2	\N	4	2	\N	C-LG56TS	2026-04-08 23:27:34.779043	\N	2026-04-08 22:26:34.421	2026-04-08 22:27:34.677	terminee	vomissement et fièvre persistante	rien à siganker	aerocolie non sévère	\N	\N	\N	\N
8	2	\N	4	2	\N	C-60HQJ7	2026-04-08 23:47:35.994655	\N	2026-04-08 22:44:06.214	2026-04-08 22:47:35.833	terminee	vomissement et fièvre persistante	hhhhhhhhhhhhhhh jjjjjjjjjjjjj	bbbbbbbbbbbbbbbbbbbbbbbbbb nnnnnnnnnnnnnnnnnnnnn	\N	\N	\N	\N
9	1	\N	4	2	\N	C-WXK7C8	2026-04-09 00:02:28.579772	\N	2026-04-08 23:00:04.349	2026-04-08 23:02:28.379	terminee	Douleurs abdominales			\N	\N	\N	\N
10	2	\N	4	2	\N	C-UU68E5	2026-04-09 00:11:27.790893	\N	2026-04-08 23:10:41.526	2026-04-08 23:11:27.672	terminee	Douleurs abdominales	2EZRETRYUT	34TYR322222FA	\N	\N	\N	\N
11	2	\N	4	2	\N	C-1VU47E	2026-04-09 00:31:18.492927	\N	2026-04-08 23:28:27.374	2026-04-08 23:31:18.399	terminee	Patient se présente avec une fièvre modérée depuis 48 heures, accompagnée de céphalées, fatigue générale et légère toux sèche.			\N	\N	\N	\N
12	1	\N	4	2	\N	C-46ACNJ	2026-04-09 00:43:34.464765	\N	2026-04-08 23:42:24.861	2026-04-08 23:43:34.391	terminee	vomissement et fièvre persistante		Syndrome grippal	\N	\N	\N	\N
13	1	1	4	2	\N	C-YPUUCO	2026-04-09 01:27:54.729842	\N	2026-04-09 00:26:43.283	2026-04-09 00:27:54.665	terminee	Patient se présente avec une fièvre modérée depuis 48 heures, accompagnée de céphalées, fatigue générale et légère toux sèche.		GRIPPE BASIQUE	\N	\N	\N	\N
14	1	\N	4	2	\N	C-05748L	2026-04-09 01:31:31.4226	\N	2026-04-09 00:30:16.945	2026-04-09 00:31:31.347	terminee	 Patient se présente avec une fièvre modérée depuis 48 heures, accompagnée de céphalées, fatigue générale et légère toux sèche.		grippe basique	\N	\N	\N	\N
15	1	\N	4	2	\N	C-O8Y5GH	2026-04-09 09:22:41.608805	\N	2026-04-09 08:20:56.72	2026-04-09 08:22:41.535	terminee	Patient se présente avec une fièvre modérée depuis 48 heures, accompagnée de céphalées, fatigue générale et légère toux sèche.		Syndrome grippal	\N	\N	\N	\N
16	1	\N	4	2	\N	C-CISCZI	2026-04-09 09:28:57.693298	\N	2026-04-09 08:24:47.68	2026-04-09 08:28:57.618	terminee	vomissement et fièvre persistante		Patient se présente avec une fièvre modérée depuis 48 heures, accompagnée de céphalées, fatigue générale et légère toux sèche.\n\nDiag: Syndrome grippal	\N	\N	\N	\N
17	1	1	4	2	\N	C-SQ5XIG	2026-04-09 09:32:58.655157	\N	2026-04-09 08:31:55.29	2026-04-09 08:32:58.571	terminee	vomissement et fièvre persistante		RIEN A SIGNALER	\N	\N	\N	\N
18	2	\N	4	2	\N	C-R6NJLB	2026-04-09 09:37:06.591127	\N	2026-04-09 08:36:42.906	2026-04-09 08:37:06.509	terminee	Douleurs abdominales		AZEDRFTGHYUJIKOP QSDWFXCGHBUJIKNOPLM¨%	\N	\N	\N	\N
\.


--
-- TOC entry 5222 (class 0 OID 18417)
-- Dependencies: 236
-- Data for Name: disponibilites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disponibilites (id_dispo, medecin_id, jour_semaine, heure_debut, heure_fin) FROM stdin;
1	1	1	10:00:00	13:00:00
2	1	3	10:19:00	12:00:00
3	2	2	15:00:00	17:00:00
\.


--
-- TOC entry 5210 (class 0 OID 18262)
-- Dependencies: 224
-- Data for Name: family_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.family_members (id_member, id_titulaire, nom, prenom, date_naissance, sexe, lien, tuteur, allergies, groupe_sanguin, actif, date_ajout) FROM stdin;
1	1	NACOULMA	Elza	2019-04-01	femme	Soeur	BAOWENDMANEGDA DORIS FALLONE NACOULMA	{}	O+	t	2026-03-13 10:04:29.76414
\.


--
-- TOC entry 5226 (class 0 OID 18465)
-- Dependencies: 240
-- Data for Name: fichiers_medicaux; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fichiers_medicaux (id_fichier, id_resultat, type_fichier, nom_fichier, chemin_stockage, taille_ko, date_upload) FROM stdin;
\.


--
-- TOC entry 5214 (class 0 OID 18298)
-- Dependencies: 228
-- Data for Name: medecins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.medecins (id_medecin, carte_rfid, nom, prenom, specialite, id_service, telephone, sexe, email, code_pin, disponible, date_embauche, actif) FROM stdin;
1	MED-9AAF5	Tarik	Moussa	Médecine générale	1	0642982756	femme	Tarik.m@caretrack.com	$2a$10$DhBsf/v5L7TUBBjJXEezxuzup/iIcn03lrFnbFtftKr0nbRnu66Su	t	\N	t
2	MED-OTK00	Nacoulma	Maurice	Analyses sanguines	4	0642982757	homme	maurice_n@gmail.com	$2a$10$8OTWqgjh3TZJxN1R8zfz6OurQvvcETzh6kRqkQ5OWrN2i/Dk.vsgi	t	\N	t
\.


--
-- TOC entry 5234 (class 0 OID 18564)
-- Dependencies: 248
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, patient_id, titre, message, type, lu, created_at) FROM stdin;
1	1	Paiement confirmé	Votre paiement de 45.00 MAD a été confirmé. Votre rendez-vous est maintenant actif.	paiement	f	2026-04-07 22:32:58.234698
2	1	Paiement confirmé	Votre paiement de 60.00 MAD a été confirmé. Votre rendez-vous est maintenant actif.	paiement	f	2026-04-08 15:44:41.987937
3	1	Paiement confirmé	Votre paiement de 45.00 MAD a été confirmé. Votre rendez-vous est maintenant actif.	paiement	f	2026-04-08 18:02:08.520637
\.


--
-- TOC entry 5230 (class 0 OID 18510)
-- Dependencies: 244
-- Data for Name: ordonnances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ordonnances (id_ordonnance, id_consultation, rendez_vous_id, id_medecin, date_prescription, medicaments, posologie, duree_traitement, instructions, envoyee_electronique, chemin_pdf, statut_pdf, date_generation) FROM stdin;
\.


--
-- TOC entry 5232 (class 0 OID 18539)
-- Dependencies: 246
-- Data for Name: paiements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paiements (id, patient_id, rendez_vous_id, montant, methode_paiement, statut, stripe_payment_id, description, date_paiement) FROM stdin;
3	1	12	60.00	stripe	confirme	pi_3TJxLRFLNDdgKlq016ez0PJU	Rendez-vous avec Dr. Moussa Tarik	2026-04-08 15:44:41.973091
\.


--
-- TOC entry 5208 (class 0 OID 18237)
-- Dependencies: 222
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id_patient, carte_rfid, nom, prenom, date_naissance, sexe, adresse, code_postal, ville, email, telephone, cin, numero_secu, mutuelle, groupe_sanguin, allergies, code_pin, medecin_traitant, date_inscription, email_verified, verification_token, verification_token_expires, actif, photo_url) FROM stdin;
1	PAT9660	BAOWENDMANEGDA DORIS FALLONE	NACOULMA	2005-07-29	femme	Avenue Allal El Fassi	30000	Rabat	nacoulmafallone@gmail.com	+212642982756	A3237307	\N	\N	O+	{}	$2a$10$Hv2aUrKimZPVQq4sdH6opuBj1Z0nwy8pAbIIsmkilwv6qoIugSIUu	\N	2026-03-13 10:03:30.479701	t	\N	\N	t	1-1775579242821-44067482.jpg
2	PAT7230	NACOULMA	Ivan	2009-07-22	homme	Avenue Allal El Fassi	32000	Rabat	nacoulmafallone1529@gmail.com	+212643566789	SGRT678900	\N	\N	O+	{Aspirine}	$2a$10$n8SntM2N67nCPzo70UAlY.Bt5vTEuhU2ryzLFJoh9zn805zCv.4c.	\N	2026-04-08 17:08:37.917406	t	\N	\N	t	2-1775664576246-632940348.jpg
\.


--
-- TOC entry 5206 (class 0 OID 18220)
-- Dependencies: 220
-- Data for Name: pending_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pending_registrations (id, email, verification_token, verification_token_expires, registration_data, created_at) FROM stdin;
\.


--
-- TOC entry 5220 (class 0 OID 18384)
-- Dependencies: 234
-- Data for Name: rendez_vous; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rendez_vous (id, patient_id, id_member, medecin_id, date_rdv, heure_rdv, motif, statut, created_at, updated_at, montant_total) FROM stdin;
12	1	\N	1	2026-04-20	11:30:00	DOULEUR	confirme	2026-04-08 15:43:54.148849	2026-04-08 15:44:41.980703	60.00
15	1	1	2	2026-04-21	15:30:00	je ne me sens pas bien seulement	en_attente_paiement	2026-04-08 16:37:10.228079	2026-04-08 16:37:10.228079	45.00
\.


--
-- TOC entry 5224 (class 0 OID 18437)
-- Dependencies: 238
-- Data for Name: resultats_examens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resultats_examens (id_resultat, id_consultation, rendez_vous_id, id_patient, type_examen, date_examen, compte_rendu, conclusion, medecin_responsable, fichiers_joints) FROM stdin;
\.


--
-- TOC entry 5216 (class 0 OID 18321)
-- Dependencies: 230
-- Data for Name: salles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salles (id_salle, numero_salle, batiment, etage, id_service, occupee, capacite, equipements, derniere_utilisation, actif) FROM stdin;
\.


--
-- TOC entry 5212 (class 0 OID 18284)
-- Dependencies: 226
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id_service, nom, description, tarif, duree_moyenne, actif) FROM stdin;
1	Médecine générale	Consultation médicale standard	45.00	30	t
2	Radiologie	Examens radiologiques	65.00	20	t
3	Échographie	Échographie médicale	55.00	25	t
4	Analyses sanguines	Prélèvements et analyses	30.00	15	t
5	Vaccination	Vaccinations diverses	20.00	10	t
6	Dentiste	Soins dentaires	50.00	40	t
\.


--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 241
-- Name: constantes_vitales_id_constante_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.constantes_vitales_id_constante_seq', 1, false);


--
-- TOC entry 5256 (class 0 OID 0)
-- Dependencies: 231
-- Name: consultations_id_consultation_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.consultations_id_consultation_seq', 18, true);


--
-- TOC entry 5257 (class 0 OID 0)
-- Dependencies: 235
-- Name: disponibilites_id_dispo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disponibilites_id_dispo_seq', 3, true);


--
-- TOC entry 5258 (class 0 OID 0)
-- Dependencies: 223
-- Name: family_members_id_member_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.family_members_id_member_seq', 1, true);


--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 239
-- Name: fichiers_medicaux_id_fichier_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fichiers_medicaux_id_fichier_seq', 1, false);


--
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 227
-- Name: medecins_id_medecin_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.medecins_id_medecin_seq', 2, true);


--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 247
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 3, true);


--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 243
-- Name: ordonnances_id_ordonnance_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ordonnances_id_ordonnance_seq', 18, true);


--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 245
-- Name: paiements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paiements_id_seq', 4, true);


--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 221
-- Name: patients_id_patient_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patients_id_patient_seq', 2, true);


--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 219
-- Name: pending_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pending_registrations_id_seq', 2, true);


--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 233
-- Name: rendez_vous_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rendez_vous_id_seq', 16, true);


--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 237
-- Name: resultats_examens_id_resultat_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resultats_examens_id_resultat_seq', 1, false);


--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 229
-- Name: salles_id_salle_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salles_id_salle_seq', 1, false);


--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 225
-- Name: services_id_service_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_id_service_seq', 1, false);


--
-- TOC entry 5023 (class 2606 OID 18493)
-- Name: constantes_vitales constantes_vitales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.constantes_vitales
    ADD CONSTRAINT constantes_vitales_pkey PRIMARY KEY (id_constante);


--
-- TOC entry 5005 (class 2606 OID 18357)
-- Name: consultations consultations_numero_file_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_numero_file_key UNIQUE (numero_file);


--
-- TOC entry 5007 (class 2606 OID 18355)
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id_consultation);


--
-- TOC entry 5015 (class 2606 OID 18430)
-- Name: disponibilites disponibilites_medecin_id_jour_semaine_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilites
    ADD CONSTRAINT disponibilites_medecin_id_jour_semaine_key UNIQUE (medecin_id, jour_semaine);


--
-- TOC entry 5017 (class 2606 OID 18428)
-- Name: disponibilites disponibilites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilites
    ADD CONSTRAINT disponibilites_pkey PRIMARY KEY (id_dispo);


--
-- TOC entry 4994 (class 2606 OID 18277)
-- Name: family_members family_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_pkey PRIMARY KEY (id_member);


--
-- TOC entry 5021 (class 2606 OID 18477)
-- Name: fichiers_medicaux fichiers_medicaux_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichiers_medicaux
    ADD CONSTRAINT fichiers_medicaux_pkey PRIMARY KEY (id_fichier);


--
-- TOC entry 4999 (class 2606 OID 18314)
-- Name: medecins medecins_carte_rfid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medecins
    ADD CONSTRAINT medecins_carte_rfid_key UNIQUE (carte_rfid);


--
-- TOC entry 5001 (class 2606 OID 18312)
-- Name: medecins medecins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medecins
    ADD CONSTRAINT medecins_pkey PRIMARY KEY (id_medecin);


--
-- TOC entry 5032 (class 2606 OID 18577)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5028 (class 2606 OID 18522)
-- Name: ordonnances ordonnances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordonnances
    ADD CONSTRAINT ordonnances_pkey PRIMARY KEY (id_ordonnance);


--
-- TOC entry 5030 (class 2606 OID 18552)
-- Name: paiements paiements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_pkey PRIMARY KEY (id);


--
-- TOC entry 4986 (class 2606 OID 18256)
-- Name: patients patients_carte_rfid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_carte_rfid_key UNIQUE (carte_rfid);


--
-- TOC entry 4988 (class 2606 OID 18260)
-- Name: patients patients_cin_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_cin_key UNIQUE (cin);


--
-- TOC entry 4990 (class 2606 OID 18258)
-- Name: patients patients_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_email_key UNIQUE (email);


--
-- TOC entry 4992 (class 2606 OID 18254)
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id_patient);


--
-- TOC entry 4979 (class 2606 OID 18235)
-- Name: pending_registrations pending_registrations_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_registrations
    ADD CONSTRAINT pending_registrations_email_key UNIQUE (email);


--
-- TOC entry 4981 (class 2606 OID 18233)
-- Name: pending_registrations pending_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_registrations
    ADD CONSTRAINT pending_registrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5013 (class 2606 OID 18400)
-- Name: rendez_vous rendez_vous_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rendez_vous
    ADD CONSTRAINT rendez_vous_pkey PRIMARY KEY (id);


--
-- TOC entry 5019 (class 2606 OID 18448)
-- Name: resultats_examens resultats_examens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resultats_examens
    ADD CONSTRAINT resultats_examens_pkey PRIMARY KEY (id_resultat);


--
-- TOC entry 5003 (class 2606 OID 18333)
-- Name: salles salles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salles
    ADD CONSTRAINT salles_pkey PRIMARY KEY (id_salle);


--
-- TOC entry 4996 (class 2606 OID 18296)
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id_service);


--
-- TOC entry 5024 (class 1259 OID 18591)
-- Name: idx_constantes_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_constantes_patient ON public.constantes_vitales USING btree (id_patient);


--
-- TOC entry 5008 (class 1259 OID 18587)
-- Name: idx_consultations_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consultations_patient ON public.consultations USING btree (id_patient);


--
-- TOC entry 5009 (class 1259 OID 18588)
-- Name: idx_consultations_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consultations_statut ON public.consultations USING btree (statut);


--
-- TOC entry 4997 (class 1259 OID 18586)
-- Name: idx_medecins_rfid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_medecins_rfid ON public.medecins USING btree (carte_rfid);


--
-- TOC entry 5025 (class 1259 OID 18797)
-- Name: idx_ordonnances_consultation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ordonnances_consultation ON public.ordonnances USING btree (id_consultation);


--
-- TOC entry 5026 (class 1259 OID 18798)
-- Name: idx_ordonnances_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ordonnances_statut ON public.ordonnances USING btree (statut_pdf);


--
-- TOC entry 4982 (class 1259 OID 18585)
-- Name: idx_patients_cin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_cin ON public.patients USING btree (cin);


--
-- TOC entry 4983 (class 1259 OID 18584)
-- Name: idx_patients_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_email ON public.patients USING btree (email);


--
-- TOC entry 4984 (class 1259 OID 18583)
-- Name: idx_patients_rfid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_rfid ON public.patients USING btree (carte_rfid);


--
-- TOC entry 5010 (class 1259 OID 18590)
-- Name: idx_rendezvous_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rendezvous_date ON public.rendez_vous USING btree (date_rdv);


--
-- TOC entry 5011 (class 1259 OID 18589)
-- Name: idx_rendezvous_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rendezvous_patient ON public.rendez_vous USING btree (patient_id);


--
-- TOC entry 5049 (class 2606 OID 18499)
-- Name: constantes_vitales constantes_vitales_id_consultation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.constantes_vitales
    ADD CONSTRAINT constantes_vitales_id_consultation_fkey FOREIGN KEY (id_consultation) REFERENCES public.consultations(id_consultation);


--
-- TOC entry 5050 (class 2606 OID 18494)
-- Name: constantes_vitales constantes_vitales_id_patient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.constantes_vitales
    ADD CONSTRAINT constantes_vitales_id_patient_fkey FOREIGN KEY (id_patient) REFERENCES public.patients(id_patient);


--
-- TOC entry 5051 (class 2606 OID 18504)
-- Name: constantes_vitales constantes_vitales_rendez_vous_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.constantes_vitales
    ADD CONSTRAINT constantes_vitales_rendez_vous_id_fkey FOREIGN KEY (rendez_vous_id) REFERENCES public.rendez_vous(id);


--
-- TOC entry 5036 (class 2606 OID 18373)
-- Name: consultations consultations_id_medecin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_id_medecin_fkey FOREIGN KEY (id_medecin) REFERENCES public.medecins(id_medecin);


--
-- TOC entry 5037 (class 2606 OID 18363)
-- Name: consultations consultations_id_member_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_id_member_fkey FOREIGN KEY (id_member) REFERENCES public.family_members(id_member);


--
-- TOC entry 5038 (class 2606 OID 18358)
-- Name: consultations consultations_id_patient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_id_patient_fkey FOREIGN KEY (id_patient) REFERENCES public.patients(id_patient);


--
-- TOC entry 5039 (class 2606 OID 18378)
-- Name: consultations consultations_id_salle_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_id_salle_fkey FOREIGN KEY (id_salle) REFERENCES public.salles(id_salle);


--
-- TOC entry 5040 (class 2606 OID 18368)
-- Name: consultations consultations_id_service_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_id_service_fkey FOREIGN KEY (id_service) REFERENCES public.services(id_service);


--
-- TOC entry 5044 (class 2606 OID 18431)
-- Name: disponibilites disponibilites_medecin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilites
    ADD CONSTRAINT disponibilites_medecin_id_fkey FOREIGN KEY (medecin_id) REFERENCES public.medecins(id_medecin) ON DELETE CASCADE;


--
-- TOC entry 5033 (class 2606 OID 18278)
-- Name: family_members family_members_id_titulaire_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_id_titulaire_fkey FOREIGN KEY (id_titulaire) REFERENCES public.patients(id_patient) ON DELETE CASCADE;


--
-- TOC entry 5048 (class 2606 OID 18478)
-- Name: fichiers_medicaux fichiers_medicaux_id_resultat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fichiers_medicaux
    ADD CONSTRAINT fichiers_medicaux_id_resultat_fkey FOREIGN KEY (id_resultat) REFERENCES public.resultats_examens(id_resultat);


--
-- TOC entry 5034 (class 2606 OID 18315)
-- Name: medecins medecins_id_service_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medecins
    ADD CONSTRAINT medecins_id_service_fkey FOREIGN KEY (id_service) REFERENCES public.services(id_service);


--
-- TOC entry 5057 (class 2606 OID 18578)
-- Name: notifications notifications_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id_patient);


--
-- TOC entry 5052 (class 2606 OID 18523)
-- Name: ordonnances ordonnances_id_consultation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordonnances
    ADD CONSTRAINT ordonnances_id_consultation_fkey FOREIGN KEY (id_consultation) REFERENCES public.consultations(id_consultation);


--
-- TOC entry 5053 (class 2606 OID 18533)
-- Name: ordonnances ordonnances_id_medecin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordonnances
    ADD CONSTRAINT ordonnances_id_medecin_fkey FOREIGN KEY (id_medecin) REFERENCES public.medecins(id_medecin);


--
-- TOC entry 5054 (class 2606 OID 18528)
-- Name: ordonnances ordonnances_rendez_vous_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordonnances
    ADD CONSTRAINT ordonnances_rendez_vous_id_fkey FOREIGN KEY (rendez_vous_id) REFERENCES public.rendez_vous(id);


--
-- TOC entry 5055 (class 2606 OID 18553)
-- Name: paiements paiements_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id_patient);


--
-- TOC entry 5056 (class 2606 OID 18558)
-- Name: paiements paiements_rendez_vous_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_rendez_vous_id_fkey FOREIGN KEY (rendez_vous_id) REFERENCES public.rendez_vous(id);


--
-- TOC entry 5041 (class 2606 OID 18406)
-- Name: rendez_vous rendez_vous_id_member_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rendez_vous
    ADD CONSTRAINT rendez_vous_id_member_fkey FOREIGN KEY (id_member) REFERENCES public.family_members(id_member);


--
-- TOC entry 5042 (class 2606 OID 18411)
-- Name: rendez_vous rendez_vous_medecin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rendez_vous
    ADD CONSTRAINT rendez_vous_medecin_id_fkey FOREIGN KEY (medecin_id) REFERENCES public.medecins(id_medecin) ON DELETE CASCADE;


--
-- TOC entry 5043 (class 2606 OID 18401)
-- Name: rendez_vous rendez_vous_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rendez_vous
    ADD CONSTRAINT rendez_vous_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id_patient) ON DELETE CASCADE;


--
-- TOC entry 5045 (class 2606 OID 18449)
-- Name: resultats_examens resultats_examens_id_consultation_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resultats_examens
    ADD CONSTRAINT resultats_examens_id_consultation_fkey FOREIGN KEY (id_consultation) REFERENCES public.consultations(id_consultation);


--
-- TOC entry 5046 (class 2606 OID 18459)
-- Name: resultats_examens resultats_examens_id_patient_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resultats_examens
    ADD CONSTRAINT resultats_examens_id_patient_fkey FOREIGN KEY (id_patient) REFERENCES public.patients(id_patient);


--
-- TOC entry 5047 (class 2606 OID 18454)
-- Name: resultats_examens resultats_examens_rendez_vous_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resultats_examens
    ADD CONSTRAINT resultats_examens_rendez_vous_id_fkey FOREIGN KEY (rendez_vous_id) REFERENCES public.rendez_vous(id);


--
-- TOC entry 5035 (class 2606 OID 18334)
-- Name: salles salles_id_service_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salles
    ADD CONSTRAINT salles_id_service_fkey FOREIGN KEY (id_service) REFERENCES public.services(id_service);


-- Completed on 2026-04-09 10:06:11

--
-- PostgreSQL database dump complete
--

\unrestrict snoaNYoZxAqPf7l5LyHZ3OzB8HaSBJ63y5PCFp1YaSSS67L47PFo2bTILunW6Pw

